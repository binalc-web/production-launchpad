import type { FC } from 'react';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CalendarDotsIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
} from '@phosphor-icons/react';
import moment from 'moment';

import type { ChronologyType } from '../types/BillingChronologyDetailsType';
import { useQuery } from '@tanstack/react-query';
import { getFilePreview } from '@/api/caseManagement/addCase';

const RenderBillingData: FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => {
  return (
    <Box sx={{ minWidth: { xs: 185, lg: 220 } }}>
      <Typography fontSize={12} color="neutral.500">
        {title}
      </Typography>
      <Typography fontSize={14} fontWeight={500}>
        {subtitle}
      </Typography>
    </Box>
  );
};

const BillingSummaryFormat: FC<{ file: ChronologyType | undefined }> = ({
  file,
}) => {
  const {
    refetch: refetchPreview,
    isRefetching,
    isError,
    error,
  } = useQuery({
    enabled: false,
    queryKey: ['selectedFile', file?._id],
    queryFn: () => getFilePreview(file?.file?._id || ''),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  const costBreackDown = (file?.charge_breakdown ?? {}) as Record<
    string,
    number | undefined
  >;

  const hospitalCharges =
    Number(
      costBreackDown.hospital_charges ?? costBreackDown.hospitalCharges ?? 0
    ) || 0;
  const physicianCharges =
    Number(
      costBreackDown.physician_charges ?? costBreackDown.physicianCharges ?? 0
    ) || 0;
  const medicationCharges =
    Number(
      costBreackDown.medication_charges ?? costBreackDown.medicationCharges ?? 0
    ) || 0;
  const taxes = Number(costBreackDown.taxes ?? 0) || 0;
  const otherCharges =
    Number(costBreackDown.other_charges ?? costBreackDown.otherCharges ?? 0) ||
    0;
  const insurancePaymentsOffsets =
    Number(
      costBreackDown.insurance_payments_offsets ??
        costBreackDown.insurancePaymentsOffsets ??
        file?.insurance_paid ??
        0
    ) || 0;

  // Add all applicable charges, then subtract insurance offsets.
  const totalItemizedCharges =
    hospitalCharges +
    physicianCharges +
    medicationCharges +
    taxes +
    otherCharges;
  const grossAmount = totalItemizedCharges || Number(file?.amount_billed || 0);
  const totalBilled = Math.max(0, grossAmount - insurancePaymentsOffsets);

  const handleDownload = (): void => {
    void refetchPreview().then((response) => {
      if (response.data) {
        window.open(response.data.data, '_blank');
      }
    });
  };

  return file ? (
    <Box>
      <Typography variant="h3">Detailed Billing Cycle Summary</Typography>
      <Box
        sx={{
          mt: 5,
        }}
      >
        <Typography variant="h4">Hospitalization Details</Typography>
        <Box
          sx={{
            gap: 2,
            mt: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <RenderBillingData
            title="Facility/ Provider"
            subtitle={file?.location || '-'}
          />
          <RenderBillingData
            title="Date of Admission"
            subtitle={
              file?.admission_date
                ? moment(file?.admission_date).format('MM-DD-YYYY')
                : '-'
            }
          />
          <RenderBillingData
            title="Date of Discharge"
            subtitle={
              file?.discharge_date
                ? moment(file?.discharge_date).format('MM-DD-YYYY')
                : '-'
            }
          />
          <RenderBillingData
            title="Total Hospital Stay"
            subtitle={
              file?.admission_date && file?.discharge_date
                ? moment(file?.admission_date).from(file?.discharge_date)
                : '-'
            }
          />
          <RenderBillingData
            title="Primary Diagnosis"
            subtitle={file?.diagnoses || '-'}
          />
          <RenderBillingData title="Procedure Performed" subtitle="-" />
          <RenderBillingData
            title="Attending Physician"
            subtitle={file?.physician || '-'}
          />
          <RenderBillingData
            title="Insurance Provider"
            subtitle={file?.payer || '-'}
          />
          <RenderBillingData
            title="Department"
            subtitle={file?.department || '-'}
          />
        </Box>
      </Box>
      <Divider sx={{ my: 5 }} />
      <Typography variant="h3">Billing Information</Typography>
      <Box
        sx={{
          mt: 5,
        }}
      >
        <Box
          sx={{
            gap: 2,
            mt: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <RenderBillingData
            title="Billing Date"
            subtitle={moment(file?.date).format('MM-DD-YYYY')}
          />
          <RenderBillingData
            title="Invoice ID"
            subtitle={file?.invoice_number || '-'}
          />
          <RenderBillingData
            title="Payment Mode"
            subtitle={
              file?.insurance_paid > 0 && file?.patient_paid > 0
                ? 'Insurance & Out-of-Pocket Payments'
                : file?.insurance_paid > 0 && file?.patient_paid === 0
                  ? 'Insurance Payment'
                  : file?.insurance_paid === 0 && file?.patient_paid > 0
                    ? 'Out-of-Pocket Payment'
                    : 'No Payment'
            }
          />
          <RenderBillingData
            title="Policy Number"
            subtitle={file?.policyNumber || '-'}
          />
        </Box>
        <Box
          sx={{
            gap: 2,
            mt: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <RenderBillingData
            title="Transaction ID (Insurance Payment)"
            subtitle={file?.transactionId || '-'}
          />
          <RenderBillingData
            title="Transaction ID (Out-of-Pocket Payment)"
            subtitle={file?.transactionId || '-'}
          />
        </Box>
      </Box>
      <Divider sx={{ my: 5 }} />
      <Typography variant="h3">Breakdown of Charges</Typography>
      <TableContainer component={Paper} elevation={0}>
        <Table
          sx={{ minWidth: 500, '& .MuiTableCell-root:first-child': { pl: 0 } }}
        >
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  borderColor: 'divider',
                },
              }}
            >
              <TableCell>Service Description</TableCell>
              <TableCell>Cost (USD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Amount Billed</TableCell>
              <TableCell>${totalBilled}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Hospital charges</TableCell>
              <TableCell>${hospitalCharges}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Physician charges</TableCell>
              <TableCell>${physicianCharges}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Medication charges</TableCell>
              <TableCell>${medicationCharges}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Taxes</TableCell>
              <TableCell>${taxes}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Other charges</TableCell>
              <TableCell>${otherCharges}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell>Insurance payments / offsets</TableCell>
              <TableCell>${insurancePaymentsOffsets}</TableCell>
            </TableRow>
            <TableRow
              sx={{
                '& td': {
                  borderColor: 'divider',
                },
                '&:last-child td, &:last-child th': { border: 0 },
              }}
            >
              <TableCell sx={{ fontWeight: 600 }}>Total Charges</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>${totalBilled}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {file?.file ? (
        <>
          {' '}
          <Divider sx={{ my: 5 }} />
          <Typography variant="h3">Documents Included</Typography>
          <Box
            sx={{
              p: 2,
              mt: 5,
              gap: 2,
              borderRadius: 2,
              display: 'flex',
              border: '1px solid',
              alignItems: 'center',
              borderColor: 'divider',
              justifyContent: 'space-between',
              maxWidth: 500,
            }}
          >
            <Box
              sx={{
                gap: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: 'neutral.50',
                  color: 'text.primary',
                }}
              >
                <FilePdfIcon size={24} />
              </Avatar>
              <Box>
                <Typography fontWeight={500}>{file?.file?.fileName}</Typography>
                <Box
                  sx={{
                    mt: 1.25,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <CalendarDotsIcon />
                  <Typography ml={1} variant="body2" color="text.secondary">
                    {moment(file?.file?.createdAt).format('MM-DD-YYYY')}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box>
              <IconButton
                variant="soft"
                sx={{ p: 0.5 }}
                onClick={handleDownload}
              >
                {isRefetching ? (
                  <CircularProgress size={24} />
                ) : (
                  <DownloadSimpleIcon />
                )}
              </IconButton>
            </Box>
          </Box>
          {isError ? (
            <Typography mt={1} fontWeight={600} variant="body2" color="error">
              {error?.message}
            </Typography>
          ) : null}
        </>
      ) : null}
    </Box>
  ) : (
    <Typography>Data Not Found</Typography>
  );
};

export default BillingSummaryFormat;
