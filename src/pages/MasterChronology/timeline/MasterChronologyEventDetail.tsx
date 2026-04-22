import type { FC } from 'react';
import { Box, Card, Grid, IconButton, Typography } from '@mui/material';
import {
  CalendarBlankIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FilesIcon,
  FileTextIcon,
  HospitalIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  WalletIcon,
} from '@phosphor-icons/react';
import moment from 'moment';
import type {
  BillingSummary,
  ChronologyEntry,
  MasterChronologyFile,
  MedicalSummary,
} from '../types/MasterChronologyDetailsType';
import { getFilePreview } from '@/api/caseManagement/addCase';

interface MasterChronologyEventDetailProps {
  entry: ChronologyEntry;
  date: string;
  files?: Array<MasterChronologyFile>;
}

import { formatCurrency } from '@/utils/masterChronologyUtilities';
const DetailRow: FC<{
  label: string;
  value?: string | null;
  color?: string;
}> = ({ label, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      py: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-child': { borderBottom: 0 },
    }}
  >
    <Typography
      fontSize={14}
      fontWeight={400}
      color="#677284"
      sx={{ minWidth: 260, flexShrink: 0 }}
    >
      {label}
    </Typography>
    <Box
      sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', ml: 1.5 }}
    >
      <Typography fontSize={14} fontWeight={500} color={color || '#474E5D'}>
        {value || 'NA'}
      </Typography>
    </Box>
  </Box>
);

const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="subtitle1"
    fontWeight={700}
    fontSize={15}
    sx={{ mb: 1.5, mt: 0.5 }}
  >
    {children}
  </Typography>
);

const MasterChronologyEventDetail: FC<MasterChronologyEventDetailProps> = ({
  entry,
  files,
}) => {
  const medical: MedicalSummary = entry.medicalSummary ?? {};
  const billingSummaries: Array<BillingSummary> = entry.billingSummary ?? [];
  const primaryBilling: BillingSummary | undefined = billingSummaries[0];

  const hasMedical = Object.keys(medical).length > 0;
  const hasBilling = billingSummaries.length > 0;

  const totalEventAmount =
    typeof entry.totalAmount === 'number'
      ? entry.totalAmount
      : billingSummaries.reduce(
          (sum, b) => sum + (Number(b.amount_billed) || 0),
          0
        );

  const title = medical.title || primaryBilling?.title || 'Event Details';
  const documentFiles: Array<MasterChronologyFile> = files ?? [];

  const sourceDocuments = Array.from(
    new Set(
      (entry.fileDetails || [])
        .map((f) => f?.fileName)
        .filter((name): name is string => Boolean(name))
    )
  );

  const handleDownload = async (fileId: string): Promise<void> => {
    try {
      const response = await getFilePreview(fileId);
      const url = response?.data;
      if (url) {
        window.open(url, '_blank');
      }
    } catch {
      // no-op; optionally hook into toast system
    }
  };

  const admissionDate = medical.admission_date
    ? moment(medical.admission_date).format('MM-DD-YYYY')
    : null;
  const dischargeDate = medical.discharge_date
    ? moment(medical.discharge_date).format('MM-DD-YYYY')
    : null;

  const stayDays =
    admissionDate && dischargeDate
      ? moment(medical.discharge_date).diff(
          moment(medical.admission_date),
          'days'
        )
      : null;

  const billingBreakdowns = billingSummaries
    .map((billingSummary) => {
      if (billingSummary.chargeBreakdown) {
        return billingSummary.chargeBreakdown;
      }

      const rawBillingBreakdown = (
        billingSummary as unknown as Record<string, unknown>
      )['charge_breakdown'] as Record<string, unknown> | undefined;

      if (!rawBillingBreakdown) return undefined;

      return {
        hospitalCharges: Number(rawBillingBreakdown['hospital_charges'] ?? 0),
        physicianCharges: Number(rawBillingBreakdown['physician_charges'] ?? 0),
        medicationCharges: Number(
          rawBillingBreakdown['medication_charges'] ?? 0
        ),
        taxes: Number(rawBillingBreakdown['taxes'] ?? 0),
        insurancePaymentsOffsets: Number(
          rawBillingBreakdown['insurance_payments_offsets'] ?? 0
        ),
        otherCharges: Number(rawBillingBreakdown['other_charges'] ?? 0),
      } as BillingSummary['chargeBreakdown'];
    })
    .filter(
      (
        breakdown
      ): breakdown is NonNullable<BillingSummary['chargeBreakdown']> =>
        breakdown != null
    );

  const {
    amountBilledTotal,
    insurancePaidTotal,
    patientPaidTotal,
    patientDueTotal,
  } = billingSummaries.reduce(
    (totals, b) => ({
      amountBilledTotal:
        totals.amountBilledTotal + (Number(b.amount_billed) || 0),
      insurancePaidTotal:
        totals.insurancePaidTotal + (Number(b.insurance_paid) || 0),
      patientPaidTotal: totals.patientPaidTotal + (Number(b.patient_paid) || 0),
      patientDueTotal: totals.patientDueTotal + (Number(b.patient_due) || 0),
    }),
    {
      amountBilledTotal: 0,
      insurancePaidTotal: 0,
      patientPaidTotal: 0,
      patientDueTotal: 0,
    }
  );

  let breakdown: Array<{ label: string; value: number }> = [];

  if (billingBreakdowns.length > 0) {
    const aggregated = billingBreakdowns.reduce(
      (accumulator, breakdownEntry) => ({
        hospitalCharges:
          accumulator.hospitalCharges +
          (Number(breakdownEntry.hospitalCharges) || 0),
        physicianCharges:
          accumulator.physicianCharges +
          (Number(breakdownEntry.physicianCharges) || 0),
        medicationCharges:
          accumulator.medicationCharges +
          (Number(breakdownEntry.medicationCharges) || 0),
        taxes: accumulator.taxes + (Number(breakdownEntry.taxes) || 0),
        insurancePaymentsOffsets:
          accumulator.insurancePaymentsOffsets +
          (Number(breakdownEntry.insurancePaymentsOffsets) || 0),
        otherCharges:
          accumulator.otherCharges + (Number(breakdownEntry.otherCharges) || 0),
      }),
      {
        hospitalCharges: 0,
        physicianCharges: 0,
        medicationCharges: 0,
        taxes: 0,
        insurancePaymentsOffsets: 0,
        otherCharges: 0,
      }
    );

    breakdown = [
      { label: 'Hospital charges', value: aggregated.hospitalCharges },
      { label: 'Physician charges', value: aggregated.physicianCharges },
      {
        label: 'Medication charges',
        value: aggregated.medicationCharges,
      },
      { label: 'Taxes', value: aggregated.taxes },
      {
        label: 'Insurance payments',
        value: aggregated.insurancePaymentsOffsets,
      },
      { label: 'Other charges', value: aggregated.otherCharges },
    ];
  } else if (hasBilling) {
    breakdown = [
      {
        label: 'Total amount billed',
        value: amountBilledTotal,
      },
      {
        label: 'Total insurance paid',
        value: insurancePaidTotal,
      },
      {
        label: 'Total patient paid',
        value: patientPaidTotal,
      },
      {
        label: 'Total patient due',
        value: patientDueTotal,
      },
    ];
  }

  const total =
    billingBreakdowns.length > 0
      ? breakdown.reduce(
          (sum, r) =>
            r.label === 'Insurance payments' ? sum - r.value : sum + r.value,
          0
        )
      : totalEventAmount;

  const getChronologySummary = (): string => {
    return entry?.combinedSummary || '';
  };

  return (
    <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 19rem)' }}>
      {/* ── Header ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            {title}
          </Typography>

          <Grid container spacing={2}>
            {/* Total charges */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: '#D7DAE0',
                    bgcolor: '#EEFFF1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <WalletIcon size={30} color="#049128" />
                </Box>
                <Box>
                  <Typography fontSize={12} color="text.secondary">
                    Total Charges
                  </Typography>
                  <Typography fontWeight={500} fontSize={16}>
                    {hasBilling ? formatCurrency(totalEventAmount) : 'NA'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Doctor — gray person icon per image */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: '#D7DAE0',
                    bgcolor: '#F2F7F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <StethoscopeIcon size={30} color="#6B7280" />
                </Box>
                <Box>
                  <Typography fontSize={12} color="text.secondary">
                    Doctor
                  </Typography>
                  <Typography fontWeight={500} fontSize={16}>
                    {medical.physician || 'NA'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Hospital — green icon per image */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: '#D7DAE0',
                    bgcolor: '#F0FDFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <HospitalIcon size={30} color="#2e7d32" />
                </Box>
                <Box>
                  <Typography fontSize={12} color="text.secondary">
                    Hospital
                  </Typography>
                  <Typography fontWeight={500} fontSize={16}>
                    {medical.location ||
                      primaryBilling?.billing_provider ||
                      'NA'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>
      {/* ── AI Summary (pixel-perfect: "+ AI Summary:" header) ── */}

      <Card
        variant="outlined"
        sx={{
          mb: 2,
          bgcolor: 'grey.50',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            fontWeight={400}
            fontSize={16}
            color="text.secondary"
            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Box
              component="svg"
              width="16px"
              height="16px"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <Box
                component="path"
                d="M15.625 11.125C15.6264 11.3543 15.5567 11.5785 15.4255 11.7666C15.2943 11.9547 15.1081 12.0976 14.8923 12.1755L11.2656 13.5156L9.92968 17.1452C9.85057 17.3601 9.70743 17.5456 9.51959 17.6766C9.33174 17.8076 9.10823 17.8779 8.87921 17.8779C8.65019 17.8779 8.42667 17.8076 8.23883 17.6766C8.05099 17.5456 7.90785 17.3601 7.82874 17.1452L6.48437 13.5156L2.85483 12.1797C2.63991 12.1006 2.45442 11.9574 2.3234 11.7696C2.19238 11.5818 2.12213 11.3582 2.12213 11.1292C2.12213 10.9002 2.19238 10.6767 2.3234 10.4888C2.45442 10.301 2.63991 10.1579 2.85483 10.0787L6.48437 8.73437L7.8203 5.10484C7.89942 4.88992 8.04255 4.70443 8.23039 4.57341C8.41824 4.44239 8.64175 4.37214 8.87077 4.37214C9.0998 4.37214 9.32331 4.44239 9.51115 4.57341C9.69899 4.70443 9.84213 4.88992 9.92124 5.10484L11.2656 8.73437L14.8951 10.0703C15.111 10.1489 15.2972 10.2926 15.4279 10.4815C15.5586 10.6704 15.6275 10.8953 15.625 11.125ZM11.6875 4.375H12.8125V5.5C12.8125 5.64918 12.8718 5.79226 12.9772 5.89775C13.0827 6.00324 13.2258 6.0625 13.375 6.0625C13.5242 6.0625 13.6672 6.00324 13.7727 5.89775C13.8782 5.79226 13.9375 5.64918 13.9375 5.5V4.375H15.0625C15.2117 4.375 15.3547 4.31574 15.4602 4.21025C15.5657 4.10476 15.625 3.96168 15.625 3.8125C15.625 3.66332 15.5657 3.52024 15.4602 3.41475C15.3547 3.30926 15.2117 3.25 15.0625 3.25H13.9375V2.125C13.9375 1.97582 13.8782 1.83274 13.7727 1.72725C13.6672 1.62176 13.5242 1.5625 13.375 1.5625C13.2258 1.5625 13.0827 1.62176 12.9772 1.72725C12.8718 1.83274 12.8125 1.97582 12.8125 2.125V3.25H11.6875C11.5383 3.25 11.3952 3.30926 11.2897 3.41475C11.1843 3.52024 11.125 3.66332 11.125 3.8125C11.125 3.96168 11.1843 4.10476 11.2897 4.21025C11.3952 4.31574 11.5383 4.375 11.6875 4.375ZM17.875 6.625H17.3125V6.0625C17.3125 5.91332 17.2532 5.77024 17.1477 5.66475C17.0422 5.55926 16.8992 5.5 16.75 5.5C16.6008 5.5 16.4577 5.55926 16.3522 5.66475C16.2468 5.77024 16.1875 5.91332 16.1875 6.0625V6.625H15.625C15.4758 6.625 15.3327 6.68426 15.2272 6.78975C15.1218 6.89524 15.0625 7.03832 15.0625 7.1875C15.0625 7.33668 15.1218 7.47976 15.2272 7.58525C15.3327 7.69074 15.4758 7.75 15.625 7.75H16.1875V8.3125C16.1875 8.46168 16.2468 8.60476 16.3522 8.71025C16.4577 8.81574 16.6008 8.875 16.75 8.875C16.8992 8.875 17.0422 8.81574 17.1477 8.71025C17.2532 8.60476 17.3125 8.46168 17.3125 8.3125V7.75H17.875C18.0242 7.75 18.1672 7.69074 18.2727 7.58525C18.3782 7.47976 18.4375 7.33668 18.4375 7.1875C18.4375 7.03832 18.3782 6.89524 18.2727 6.78975C18.1672 6.68426 18.0242 6.625 17.875 6.625Z"
                fill="#8B95A5"
              />
            </Box>
            <Typography fontSize={16} fontWeight={400} color="text.secondary">
              AI Summary:
            </Typography>
          </Typography>
          <Typography fontSize={13} color="text.secondary" lineHeight={1.6}>
            {getChronologySummary()}
          </Typography>
        </Box>
      </Card>

      {sourceDocuments.length > 0 && (
        <Card
          variant="outlined"
          sx={{
            mb: 2,
            bgcolor: 'common.white',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography
              fontWeight={400}
              fontSize={16}
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <FilesIcon size={20} />
              <Typography fontSize={16} fontWeight={400} color="text.secondary">
                Source Document
              </Typography>
            </Typography>
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 3.5,
                pt: 1.5,
                pb: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {sourceDocuments.map((fileName, index) => (
                <Typography
                  component="li"
                  key={index}
                  fontSize={14}
                  color="text.secondary"
                  lineHeight={1.4}
                >
                  {fileName}
                </Typography>
              ))}
            </Box>
          </Box>
        </Card>
      )}
      {/* ── Hospitalization Details ── */}
      <Card variant="outlined" sx={{ mb: 2, bgcolor: 'common.white' }}>
        {hasMedical && (
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <SectionTitle>Hospitalization Details</SectionTitle>
            <DetailRow label="Date of Admission" value={admissionDate} />
            <DetailRow label="Date of Discharge" value={dischargeDate} />
            <DetailRow
              label="Total Hospital Stay"
              value={stayDays !== null ? `${stayDays} Days` : 'NA'}
            />
            <DetailRow label="Type of Hospital" value={medical.location} />
            <DetailRow label="Procedure Performed" value={medical.procedure} />
            <DetailRow label="Attending Physician" value={medical.physician} />
            <DetailRow label="Diagnoses" value={medical.diagnoses} />
            <DetailRow
              label="Insurance Provider"
              value={primaryBilling?.insurance_provider}
            />
          </Box>
        )}
        {hasBilling && (
          <Box sx={{ p: 2 }}>
            <SectionTitle>Billing Details</SectionTitle>
            <DetailRow
              label="Invoice ID"
              value={primaryBilling?.invoice_number || primaryBilling?.code}
            />
            <DetailRow
              label="Billing date & time"
              value={
                primaryBilling?.date
                  ? moment(primaryBilling.date).format('MM-DD-YYYY, hh:mm A')
                  : undefined
              }
            />
            <DetailRow
              label="Payment Mode"
              value={
                primaryBilling?.insurance_provider
                  ? 'Insurance + Patient Copay'
                  : 'Patient Pay'
              }
            />
            <DetailRow
              label="Policy Number"
              value={primaryBilling?.invoice_number}
            />
            <DetailRow
              label="Billing Provider"
              value={primaryBilling?.billing_provider}
            />
            <DetailRow label="Payer" value={primaryBilling?.payer} />
          </Box>
        )}
        {hasBilling && breakdown.length > 0 && (
          <Box sx={{ p: 2 }}>
            <SectionTitle>Cost Breakdown</SectionTitle>
            {breakdown.map((row) => (
              <DetailRow label={row.label} value={formatCurrency(row.value)} />
            ))}
            <DetailRow
              label="Total"
              value={formatCurrency(total)}
              color="#049128"
            />
          </Box>
        )}
      </Card>
      {documentFiles.length > 0 && (
        <Card variant="outlined" sx={{ bgcolor: 'common.white' }}>
          <Box sx={{ p: 2 }}>
            <SectionTitle>Documents Included</SectionTitle>
            <Grid container spacing={1.5}>
              {documentFiles.map((file) => (
                <Grid key={file._id} size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.25,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: 'background.paper',
                    }}
                  >
                    {/* Left: circular file icon */}
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FilePdfIcon size={20} color="#4B5563" />
                    </Box>

                    {/* Middle: name + meta row */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        noWrap
                        title={file.fileName}
                      >
                        {file.fileName}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mt: 0.25,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Date */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <CalendarBlankIcon size={12} color="#6B7280" />
                          <Typography fontSize={11} color="text.secondary">
                            {moment(file.createdAt).format('MM-DD-YYYY')}
                          </Typography>
                        </Box>

                        <Typography fontSize={11} color="text.disabled">
                          •
                        </Typography>

                        {/* File size */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <FileTextIcon size={12} color="#6B7280" />
                          <Typography fontSize={11} color="text.secondary">
                            {file.fileSize
                              ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                              : '—'}
                          </Typography>
                        </Box>

                        <Typography fontSize={11} color="text.disabled">
                          •
                        </Typography>

                        {/* Protected badge */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.4,
                          }}
                        >
                          <ShieldCheckIcon size={12} color="#16A34A" />
                          <Typography fontSize={11} color="success.main">
                            Protected
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Right: actions */}
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <IconButton
                        size="medium"
                        sx={{
                          color: 'text.secondary',
                          backgroundColor: 'transparent',
                          '&:hover': {
                            backgroundColor: 'divider',
                            color: 'text.primary',
                            cursor: 'pointer',
                            borderRadius: '50%',
                          },
                          '&:focus': {
                            backgroundColor: 'transparent',
                            color: 'text.primary',
                            cursor: 'pointer',
                            borderRadius: '50%',
                          },
                          '&:active': {
                            backgroundColor: 'transparent',
                            color: 'text.primary',
                            cursor: 'pointer',
                            borderRadius: '50%',
                          },
                        }}
                        title="Download"
                        onClick={() => {
                          void handleDownload(file._id);
                        }}
                      >
                        <DownloadSimpleIcon size={24} />
                      </IconButton>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Card>
      )}
    </Box>
  );
};

export default MasterChronologyEventDetail;
