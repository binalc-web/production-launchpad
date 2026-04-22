export type caseFilters = {
  page: number;
  limit: number;
  searchKeyWordString?: string;
  status?: Array<string>;
  assignees?: Array<string>;
  category?: string;
};
