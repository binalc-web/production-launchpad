interface PaymentConfirmationEmailProps {
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: number;
  totalTokens: number;
  billingPeriod: "monthly" | "annually";
  transactionId: string;
  purchaseDate: Date;
  nextBillingDate: Date;
  additionalTokens?: number;
}

export function PaymentConfirmationEmailTemplate({
  userName,
  userEmail,
  planName,
  planPrice,
  totalTokens,
  billingPeriod,
  transactionId,
  purchaseDate,
  nextBillingDate,
  additionalTokens = 0
}: PaymentConfirmationEmailProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      lineHeight: '1.6',
      color: '#374151',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%)',
        background: 'linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%)',
        padding: '40px 20px',
        textAlign: 'center',
        borderRadius: '12px 12px 0 0'
      }}>
        {/* Logo */}
        <div style={{
          display: 'inline-block',
          width: '48px',
          height: '48px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          marginBottom: '16px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px'
          }}>
            ✨
          </div>
        </div>
        
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '28px',
          fontWeight: '600',
          color: '#ffffff'
        }}>
          Payment Confirmed!
        </h1>
        
        <p style={{
          margin: '0',
          fontSize: '16px',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          Welcome to magical automation
        </p>
      </div>

      {/* Main Content */}
      <div style={{
        padding: '40px 30px',
        backgroundColor: '#ffffff'
      }}>
        <h2 style={{
          margin: '0 0 24px 0',
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Thank you, {userName}! 🎉
        </h2>

        <p style={{
          margin: '0 0 32px 0',
          fontSize: '16px',
          color: '#4b5563',
          lineHeight: '1.6'
        }}>
          Your payment has been successfully processed and your N8N Bazar subscription is now active. You're all set to create magical workflows!
        </p>

        {/* Subscription Summary */}
        <div style={{
          backgroundColor: '#f0fdfa',
          border: '2px solid #00D4AA',
          borderRadius: '12px',
          padding: '24px',
          margin: '32px 0'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#059669'
          }}>
            📦 Your Subscription Details
          </h3>
          
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid #a7f3d0'
            }}>
              <span style={{ fontSize: '14px', color: '#047857' }}>Plan:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#047857' }}>{planName}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid #a7f3d0'
            }}>
              <span style={{ fontSize: '14px', color: '#047857' }}>Tokens:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#047857' }}>
                {formatTokens(totalTokens)}/month
                {additionalTokens > 0 && (
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                    (includes {formatTokens(additionalTokens)} extra)
                  </span>
                )}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid #a7f3d0'
            }}>
              <span style={{ fontSize: '14px', color: '#047857' }}>Billing:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#047857' }}>
                {formatPrice(planPrice)}/{billingPeriod === 'monthly' ? 'month' : 'year'}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#047857' }}>Next billing:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#047857' }}>
                {formatDate(nextBillingDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          margin: '24px 0'
        }}>
          <h4 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#334155'
          }}>
            🧾 Transaction Details
          </h4>
          
          <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.8' }}>
            <p style={{ margin: '0' }}>
              <strong>Transaction ID:</strong> {transactionId}
            </p>
            <p style={{ margin: '0' }}>
              <strong>Purchase Date:</strong> {formatDate(purchaseDate)}
            </p>
            <p style={{ margin: '0' }}>
              <strong>Amount Charged:</strong> {formatPrice(planPrice)}
            </p>
            <p style={{ margin: '0' }}>
              <strong>Payment Method:</strong> •••• •••• •••• 4242
            </p>
          </div>
        </div>

        {/* What's Next */}
        <div style={{
          backgroundColor: '#fefce8',
          border: '1px solid #facc15',
          borderRadius: '8px',
          padding: '20px',
          margin: '24px 0'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#a16207'
          }}>
            ✨ What's Next?
          </h4>
          
          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#a16207',
            lineHeight: '1.6'
          }}>
            <li>Your tokens are now active and ready to use</li>
            <li>Start generating magical workflows with AI</li>
            <li>Access our premium template library</li>
            <li>Get priority support from our team</li>
          </ul>
        </div>

        <div style={{
          textAlign: 'center',
          margin: '40px 0'
        }}>
          <a href="https://n8nbazar.com/dashboard" style={{
            display: 'inline-block',
            backgroundColor: '#00D4AA',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            marginRight: '12px'
          }}>
            Go to Dashboard ✨
          </a>
          
          <a href="https://n8nbazar.com/templates" style={{
            display: 'inline-block',
            backgroundColor: 'transparent',
            color: '#00D4AA',
            textDecoration: 'none',
            padding: '14px 28px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            border: '2px solid #00D4AA'
          }}>
            Browse Templates
          </a>
        </div>

        <p style={{
          margin: '32px 0 0 0',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          Need help getting started? Check out our <a href="#" style={{ color: '#00D4AA' }}>documentation</a> or <a href="#" style={{ color: '#00D4AA' }}>contact support</a>.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '32px 30px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          This receipt was sent to <strong>{userEmail}</strong>
        </p>
        
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Questions about your subscription? We're here to help!
          </p>
          <p style={{ margin: '0 0 16px 0' }}>
            <a href="mailto:billing@n8nbazar.com" style={{ color: '#00D4AA', textDecoration: 'none' }}>billing@n8nbazar.com</a> | 
            <a href="mailto:support@n8nbazar.com" style={{ color: '#00D4AA', textDecoration: 'none', marginLeft: '8px' }}>support@n8nbazar.com</a>
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            N8N Bazar - Magical Automation Platform
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            © 2024 N8N Bazar. All rights reserved.
          </p>
          <p style={{ margin: '0' }}>
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none' }}>Manage Subscription</a> | 
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none', marginLeft: '8px' }}>Privacy Policy</a> | 
            <a href="#" style={{ color: '#00D4AA', textDecoration: 'none', marginLeft: '8px' }}>Terms</a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Function to generate HTML string for email services
export function generatePaymentConfirmationEmailHTML(props: PaymentConfirmationEmailProps): string {
  const {
    userName,
    userEmail,
    planName,
    planPrice,
    totalTokens,
    billingPeriod,
    transactionId,
    purchaseDate,
    nextBillingDate,
    additionalTokens = 0
  } = props;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation - N8N Bazar</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; background-color: #ffffff">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #00D4AA 0%, #fbbf24 50%, #22d3ee 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0">
      <!-- Logo -->
      <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 16px; position: relative">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px">✨</div>
      </div>
      <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #ffffff">Payment Confirmed!</h1>
      <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.9)">Welcome to magical automation</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px; background-color: #ffffff">
      <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #1f2937">Thank you, ${userName}! 🎉</h2>
      <p style="margin: 0 0 32px 0; font-size: 16px; color: #4b5563; line-height: 1.6">Your payment has been successfully processed and your N8N Bazar subscription is now active. You're all set to create magical workflows!</p>

      <!-- Subscription Summary -->
      <div style="background-color: #f0fdfa; border: 2px solid #00D4AA; border-radius: 12px; padding: 24px; margin: 32px 0">
        <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #059669">📦 Your Subscription Details</h3>
        <div style="display: grid; gap: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #a7f3d0">
            <span style="font-size: 14px; color: #047857">Plan:</span>
            <span style="font-size: 14px; font-weight: 600; color: #047857">${planName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #a7f3d0">
            <span style="font-size: 14px; color: #047857">Tokens:</span>
            <span style="font-size: 14px; font-weight: 600; color: #047857">
              ${formatTokens(totalTokens)}/month${additionalTokens > 0 ? ` (includes ${formatTokens(additionalTokens)} extra)` : ''}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #a7f3d0">
            <span style="font-size: 14px; color: #047857">Billing:</span>
            <span style="font-size: 14px; font-weight: 600; color: #047857">${formatPrice(planPrice)}/${billingPeriod === 'monthly' ? 'month' : 'year'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span style="font-size: 14px; color: #047857">Next billing:</span>
            <span style="font-size: 14px; font-weight: 600; color: #047857">${formatDate(nextBillingDate)}</span>
          </div>
        </div>
      </div>

      <!-- Transaction Details -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0">
        <h4 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #334155">🧾 Transaction Details</h4>
        <div style="font-size: 14px; color: #64748b; line-height: 1.8">
          <p style="margin: 0"><strong>Transaction ID:</strong> ${transactionId}</p>
          <p style="margin: 0"><strong>Purchase Date:</strong> ${formatDate(purchaseDate)}</p>
          <p style="margin: 0"><strong>Amount Charged:</strong> ${formatPrice(planPrice)}</p>
          <p style="margin: 0"><strong>Payment Method:</strong> •••• •••• •••• 4242</p>
        </div>
      </div>

      <!-- What's Next -->
      <div style="background-color: #fefce8; border: 1px solid #facc15; border-radius: 8px; padding: 20px; margin: 24px 0">
        <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #a16207">✨ What's Next?</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #a16207; line-height: 1.6">
          <li>Your tokens are now active and ready to use</li>
          <li>Start generating magical workflows with AI</li>
          <li>Access our premium template library</li>
          <li>Get priority support from our team</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 40px 0">
        <a href="https://n8nbazar.com/dashboard" style="display: inline-block; background-color: #00D4AA; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; margin-right: 12px">Go to Dashboard ✨</a>
        <a href="https://n8nbazar.com/templates" style="display: inline-block; background-color: transparent; color: #00D4AA; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; border: 2px solid #00D4AA">Browse Templates</a>
      </div>

      <p style="margin: 32px 0 0 0; font-size: 14px; color: #6b7280; text-align: center">
        Need help getting started? Check out our <a href="#" style="color: #00D4AA">documentation</a> or <a href="#" style="color: #00D4AA">contact support</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 32px 30px; border-top: 1px solid #e5e7eb; text-align: center">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280">This receipt was sent to <strong>${userEmail}</strong></p>
      <div style="font-size: 12px; color: #9ca3af; line-height: 1.5">
        <p style="margin: 0 0 8px 0">Questions about your subscription? We're here to help!</p>
        <p style="margin: 0 0 16px 0">
          <a href="mailto:billing@n8nbazar.com" style="color: #00D4AA; text-decoration: none">billing@n8nbazar.com</a> | 
          <a href="mailto:support@n8nbazar.com" style="color: #00D4AA; text-decoration: none; margin-left: 8px">support@n8nbazar.com</a>
        </p>
        <p style="margin: 0 0 8px 0">N8N Bazar - Magical Automation Platform</p>
        <p style="margin: 0 0 8px 0">© 2024 N8N Bazar. All rights reserved.</p>
        <p style="margin: 0">
          <a href="#" style="color: #00D4AA; text-decoration: none">Manage Subscription</a> | 
          <a href="#" style="color: #00D4AA; text-decoration: none; margin-left: 8px">Privacy Policy</a> | 
          <a href="#" style="color: #00D4AA; text-decoration: none; margin-left: 8px">Terms</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}