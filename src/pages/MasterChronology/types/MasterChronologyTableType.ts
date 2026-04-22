/**
 * Type definition for a single row in the Master Chronology Summary table.
 */
export type MasterChronologyTableType = {
  /** Unique identifier for the chronology record. */
  _id: string;

  /** The user-defined name of the chronology. */
  name: string;

  /** ISO date string of when the chronology was generated. */
  createdAt: string;

  /** The case associated with this chronology. */
  case: {
    _id: string;
    caseId: number;
    title: string;
    caseType: string;
  };

  /** The patient associated with this chronology. */
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    contact: string;
    avatar: string | null;
  };

  /** Number of source documents linked to this chronology. */
  sourceDocumentCount: number;
};
