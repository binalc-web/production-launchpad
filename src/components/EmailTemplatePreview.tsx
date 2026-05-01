import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Mail, Eye, Code2, Send } from "lucide-react";
import { 
  AuthCodeEmailTemplate, 
  PaymentConfirmationEmailTemplate,
  generateAuthCodeEmailHTML,
  generatePaymentConfirmationEmailHTML 
} from "./email-templates/index";

export function EmailTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<"auth" | "payment">("auth");
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");

  // Sample data for email templates
  const authCodeProps = {
    userName: "Alex Johnson",
    authCode: "842657",
    expiresInMinutes: 10,
    userEmail: "alex.johnson@example.com"
  };

  const paymentProps = {
    userName: "Sarah Wilson",
    userEmail: "sarah.wilson@example.com",
    planName: "Professional",
    planPrice: 40,
    totalTokens: 6000,
    billingPeriod: "monthly" as const,
    transactionId: "txn_n8n_1234567890abcdef",
    purchaseDate: new Date("2024-12-26"),
    nextBillingDate: new Date("2025-01-26"),
    additionalTokens: 1000
  };

  const handleSendTestEmail = (templateType: "auth" | "payment") => {
    // In a real application, this would trigger an actual email send
    console.log(`Sending test ${templateType} email...`);
    
    if (templateType === "auth") {
      const htmlContent = generateAuthCodeEmailHTML(authCodeProps);
      console.log("Auth Email HTML:", htmlContent);
    } else {
      const htmlContent = generatePaymentConfirmationEmailHTML(paymentProps);
      console.log("Payment Email HTML:", htmlContent);
    }
    
    // Show success message or integrate with your email service
    alert(`Test ${templateType} email would be sent!`);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-yellow-300 to-cyan-400 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-medium">Email Templates</h1>
                <p className="text-muted-foreground">Preview and test the email templates used in N8N Bazar</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Template Selection */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <h3 className="font-medium">Available Templates</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant={selectedTemplate === "auth" ? "default" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => setSelectedTemplate("auth")}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      🔐
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">Auth Code</div>
                      <div className="text-xs text-muted-foreground">Verification email</div>
                    </div>
                  </Button>

                  <Button
                    variant={selectedTemplate === "payment" ? "default" : "outline"}
                    className="w-full justify-start gap-3"
                    onClick={() => setSelectedTemplate("payment")}
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      💳
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-sm">Payment</div>
                      <div className="text-xs text-muted-foreground">Confirmation email</div>
                    </div>
                  </Button>

                  <div className="border-t pt-3">
                    <h4 className="font-medium text-sm mb-3">Actions</h4>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => handleSendTestEmail(selectedTemplate)}
                      >
                        <Send className="w-3 h-3" />
                        Send Test Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template Info */}
              <Card className="mt-4">
                <CardHeader>
                  <h3 className="font-medium">Template Info</h3>
                </CardHeader>
                <CardContent>
                  {selectedTemplate === "auth" ? (
                    <div className="space-y-3">
                      <div>
                        <Badge variant="secondary" className="mb-2">Authentication</Badge>
                        <p className="text-sm text-muted-foreground">
                          Sent when users request a verification code for login or account verification.
                        </p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><strong>Subject:</strong> Your N8N Bazar Verification Code ✨</div>
                        <div><strong>Features:</strong></div>
                        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                          <li>Prominent verification code display</li>
                          <li>Security warning section</li>
                          <li>10-minute expiration timer</li>
                          <li>Brand-consistent design</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Badge variant="secondary" className="mb-2">Payment</Badge>
                        <p className="text-sm text-muted-foreground">
                          Sent after successful payment processing to confirm subscription details.
                        </p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div><strong>Subject:</strong> Payment Confirmed - Welcome to N8N Bazar! 🎉</div>
                        <div><strong>Features:</strong></div>
                        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                          <li>Complete subscription details</li>
                          <li>Transaction information</li>
                          <li>Next steps guidance</li>
                          <li>Support contact links</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Email Preview */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {selectedTemplate === "auth" ? "Authentication Code Email" : "Payment Confirmation Email"}
                    </h3>
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "preview" | "html")}>
                      <TabsList className="grid w-fit grid-cols-2">
                        <TabsTrigger value="preview" className="gap-2">
                          <Eye className="w-4 h-4" />
                          Preview
                        </TabsTrigger>
                        <TabsTrigger value="html" className="gap-2">
                          <Code2 className="w-4 h-4" />
                          HTML
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === "preview" ? (
                    <div className="bg-gray-100 p-6 rounded-lg overflow-hidden">
                      <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
                        {selectedTemplate === "auth" ? (
                          <AuthCodeEmailTemplate {...authCodeProps} />
                        ) : (
                          <PaymentConfirmationEmailTemplate {...paymentProps} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {selectedTemplate === "auth" 
                          ? generateAuthCodeEmailHTML(authCodeProps)
                          : generatePaymentConfirmationEmailHTML(paymentProps)
                        }
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Integration Notes */}
          <Card className="mt-6">
            <CardHeader>
              <h3 className="font-medium">Integration Notes</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">🚀 Usage</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Import the templates in your backend code:</p>
                    <div className="bg-muted p-3 rounded font-mono text-xs">
                      {`import { generateAuthCodeEmailHTML } from './email-templates';`}
                    </div>
                    <p>Generate HTML for your email service:</p>
                    <div className="bg-muted p-3 rounded font-mono text-xs">
                      {`const html = generateAuthCodeEmailHTML({
  userName: "John Doe",
  authCode: "123456",
  userEmail: "john@example.com"
});`}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">📧 Email Services</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Compatible with popular email services:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>SendGrid</li>
                      <li>AWS SES</li>
                      <li>Mailgun</li>
                      <li>Nodemailer</li>
                      <li>Resend</li>
                    </ul>
                    <p className="mt-3">All templates include MSO compatibility for Outlook support.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}