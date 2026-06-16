const assert = require("node:assert/strict")
const fs = require("node:fs")
const Module = require("node:module")
const path = require("node:path")
const ts = require("typescript")

const rootDir = path.resolve(__dirname, "..")
const fixtureDir = path.join(rootDir, "fixtures", "complex-csv")

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(rootDir, request.slice(2)), parent, isMain, options)
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText

  module._compile(output, filename)
}

const money = require("../lib/moneymirror.ts")

const files = fs.readdirSync(fixtureDir).filter((file) => file.endsWith(".csv")).sort()
const inputs = files.map((fileName) => ({
  fileName,
  csvText: fs.readFileSync(path.join(fixtureDir, fileName), "utf8"),
}))

const analysis = money.analyzeMoneyCsvTexts(inputs)
assert.equal(analysis.statements.length, 4, "expected four statements")
assert.equal(analysis.transactions.length, 48, "expected all fixture rows to parse")
assert.equal(analysis.errors.length, 0, "expected no parse errors")

const workspace = money.appendAnalysisToWorkspace(money.createMoneyWorkspace(), analysis)
const transactions = money.getWorkspaceTransactions(workspace)
const metrics = money.getMoneyMetrics(transactions)
const monthlyMetrics = money.getMonthlyMetrics(transactions)
const monthKeys = monthlyMetrics.map((month) => month.month)

assert.equal(transactions.length, 48, "workspace should expose every transaction")
assert.deepEqual(monthKeys, ["2026-01", "2026-02", "2026-03", "2026-04"], "expected four calendar months")
assert.ok(metrics.totalIncome > metrics.totalExpenses, "overall cashflow should stay positive")

const categories = new Set(transactions.map((transaction) => transaction.category))
for (const category of ["Food", "Rent", "Travel", "Shopping", "Subscriptions", "Bills", "Tools", "Investment", "Transfers"]) {
  assert.ok(categories.has(category), `expected ${category} category to be present`)
}

const latestMonth = monthlyMetrics.at(-1)
const previousMonth = monthlyMetrics.at(-2)
const suggestions = money.buildMonthlySuggestions(latestMonth, previousMonth)

assert.ok(suggestions.some((suggestion) => suggestion.tone === "warning"), "expected a spending increase warning")
assert.ok(suggestions.some((suggestion) => suggestion.tone === "appreciation"), "expected an appreciation note")
assert.ok(
  suggestions.some((suggestion) => /Shopping moved up/.test(suggestion.title)),
  "expected shopping increase to be explained"
)
assert.ok(
  suggestions.some((suggestion) => /Investment discipline improved/.test(suggestion.title)),
  "expected investment increase to be appreciated"
)

const report = money.buildMoneyReport(transactions, workspace.id)
assert.ok(report.suggestions.some((suggestion) => /SIP|index fund|invest/i.test(suggestion)), "expected investing guidance")

const editableTransaction = transactions.find((transaction) => transaction.category === "Food")
assert.ok(editableTransaction, "expected a food transaction to edit")

const editedWorkspace = money.updateWorkspaceTransactionCategory(workspace, editableTransaction.id, "Miscellaneous")
assert.equal(editedWorkspace.transactionsById[editableTransaction.id].category, "Miscellaneous", "category edit should persist")

const removedWorkspace = money.removeWorkspaceTransaction(editedWorkspace, editableTransaction.id)
assert.equal(money.getWorkspaceTransactions(removedWorkspace).length, transactions.length - 1, "delete should remove one row")
assert.equal(removedWorkspace.transactionsById[editableTransaction.id], undefined, "delete should remove indexed row")

console.table(
  monthlyMetrics.map((month) => ({
    month: month.month,
    income: month.totalIncome,
    expenses: month.totalExpenses,
    cashflow: month.netCashflow,
    biggestCategory: month.biggestCategory,
    topLeak: month.topMoneyLeak,
  }))
)

console.log(
  `Complex CSV smoke passed: ${files.length} files, ${transactions.length} transactions, ${monthlyMetrics.length} months, ${analysis.errors.length} errors.`
)
