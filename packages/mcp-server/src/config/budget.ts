export const budget = {
  searchDocs: { defaultLimit: 5, maxLimit: 20, maxExcerptChars: 1000, maxResponseTokens: 5000 },
  getDoc: { maxResponseTokens: 8000 },
  searchSymbols: {
    defaultLimit: 10,
    maxLimit: 50,
    maxSignatureTokens: 60,
    maxSummaryTokens: 40,
    maxResponseTokens: 3000,
  },
  getSymbol: {
    maxSignatureTokens: 1500,
    maxDescriptionTokens: 1200,
    maxResponseTokens: 5000,
    maxMemberSignatureTokens: 150,
    maxMemberSummaryTokens: 60,
  },
};

export type BudgetConfig = typeof budget;
