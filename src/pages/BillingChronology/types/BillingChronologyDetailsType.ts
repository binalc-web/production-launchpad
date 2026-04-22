export type ChronologyType = {
  date: string;
  title: string;
  raw_description: string;
  translated_summary: string;
  location: string;
  physician: string;
  amount_billed: number;
  insurance_paid: number;
  patient_paid: number;
  patient_due: number;
  code: string;
  payer: string;
  _id: string;
  previous_summary?: string;
  department: string;
  invoice_number: string;
  policyNumber: string;
  transactionId: string;
  chargeBreakdown?: {
    hospitalCharges?: number;
    physicianCharges?: number;
    medicationCharges?: number;
    taxes?: number;
    insurancePaymentsOffsets?: number;
    otherCharges?: number;
  };
  charge_breakdown?: {
    hospital_charges?: number;
    physician_charges?: number;
    medication_charges?: number;
    taxes?: number;
    insurance_payments_offsets?: number;
    other_charges?: number;
  };
  file: {
    _id: string;
    fileName: string;
    key: string;
    createdAt: string;
  };
  admission_date: string;
  discharge_date: string;
  diagnoses: string;
};

export type BillingChronologyDetailsType = {
  _id: string;
  chronologies: Array<ChronologyType>;
};

export type BillingSummaryType = {
  totalAmountBilled: number;
  totalPatientDue: number;
};

// Each item in the chart data has a label and value
export type BillingChartItem = {
  label: string;
  value: number;
};

// The API response format for the chart data
export type BillingChartResponse = Array<{ x: string; y: number }>;

// Keep the old type for backward compatibility
export type BillingChartType = Array<{ x: string; y: number }>;
