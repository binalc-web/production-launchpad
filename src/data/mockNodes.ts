export interface NodeParameter {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'collection' | 'json' | 'fixedCollection';
  required: boolean;
  default?: any;
  description: string;
  options?: { name: string; value: string }[];
  placeholder?: string;
}

export interface NodeCredential {
  name: string;
  displayName: string;
  required: boolean;
  description: string;
  properties: {
    name: string;
    displayName: string;
    type: 'string' | 'password' | 'hidden';
    required: boolean;
    description: string;
  }[];
}

export interface N8NNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  version: number;
  author: string;
  verified: boolean;
  downloadCount: number;
  rating: number;
  tags: string[];
  documentation: string;
  parameters: NodeParameter[];
  credentials?: NodeCredential[];
  usageGuide: {
    overview: string;
    steps: string[];
    tips: string[];
    commonUses: string[];
  };
  examples: {
    title: string;
    description: string;
    configuration: Record<string, any>;
  }[];
  lastUpdated: Date;
}

export const mockNodes: N8NNode[] = [
  {
    id: 'slack-node',
    name: 'Slack',
    displayName: 'Slack',
    description: 'Interact with Slack workspaces - send messages, create channels, manage users',
    category: 'Communication',
    subcategory: 'Team Chat',
    icon: '💬',
    color: '#4A154B',
    version: 2,
    author: 'N8N Team',
    verified: true,
    downloadCount: 125000,
    rating: 4.8,
    tags: ['messaging', 'communication', 'team', 'notifications'],
    documentation: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/',
    parameters: [
      {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        required: true,
        description: 'Method of authentication',
        options: [
          { name: 'OAuth2', value: 'slackOAuth2Api' },
          { name: 'Access Token', value: 'slackApi' }
        ]
      },
      {
        name: 'resource',
        displayName: 'Resource',
        type: 'options',
        required: true,
        description: 'Resource to operate on',
        options: [
          { name: 'Message', value: 'message' },
          { name: 'Channel', value: 'channel' },
          { name: 'User', value: 'user' }
        ]
      },
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        description: 'Operation to perform',
        options: [
          { name: 'Post', value: 'post' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' }
        ]
      },
      {
        name: 'channel',
        displayName: 'Channel',
        type: 'string',
        required: true,
        description: 'Channel name or ID',
        placeholder: '#general'
      },
      {
        name: 'text',
        displayName: 'Message Text',
        type: 'string',
        required: true,
        description: 'The message text to send',
        placeholder: 'Hello from N8N!'
      }
    ],
    credentials: [
      {
        name: 'slackOAuth2Api',
        displayName: 'Slack OAuth2',
        required: true,
        description: 'OAuth2 authentication for Slack',
        properties: [
          {
            name: 'clientId',
            displayName: 'Client ID',
            type: 'string',
            required: true,
            description: 'OAuth2 Client ID from your Slack app'
          },
          {
            name: 'clientSecret',
            displayName: 'Client Secret',
            type: 'password',
            required: true,
            description: 'OAuth2 Client Secret from your Slack app'
          },
          {
            name: 'accessToken',
            displayName: 'Access Token',
            type: 'hidden',
            required: true,
            description: 'OAuth2 Access Token (automatically generated)'
          }
        ]
      }
    ],
    usageGuide: {
      overview: 'The Slack node allows you to send messages, manage channels, and interact with users in your Slack workspace.',
      steps: [
        'Create a Slack app in your workspace or use an existing one',
        'Configure OAuth2 credentials with your app\'s Client ID and Secret',
        'Select the resource (Message, Channel, or User) and operation',
        'Configure the specific parameters for your chosen operation',
        'Test the connection and run your workflow'
      ],
      tips: [
        'Use channel IDs instead of names for better reliability',
        'Test with a private channel first to avoid spamming',
        'Consider rate limits when sending multiple messages',
        'Use rich text formatting with Slack\'s markup syntax'
      ],
      commonUses: [
        'Send notifications when workflows complete',
        'Alert team members about system events',
        'Post daily reports to specific channels',
        'Create channels for new projects automatically'
      ]
    },
    examples: [
      {
        title: 'Simple Message',
        description: 'Send a basic message to a channel',
        configuration: {
          resource: 'message',
          operation: 'post',
          channel: '#general',
          text: 'Workflow completed successfully! ✅'
        }
      },
      {
        title: 'Rich Message with Formatting',
        description: 'Send a formatted message with mentions',
        configuration: {
          resource: 'message',
          operation: 'post',
          channel: '#alerts',
          text: ':warning: *Alert:* System maintenance scheduled for <@user123>'
        }
      }
    ],
    lastUpdated: new Date('2024-01-15')
  },
  {
    id: 'google-sheets-node',
    name: 'Google Sheets',
    displayName: 'Google Sheets',
    description: 'Read, write, and manipulate Google Sheets data',
    category: 'Productivity',
    subcategory: 'Spreadsheets',
    icon: '📊',
    color: '#34A853',
    version: 2,
    author: 'N8N Team',
    verified: true,
    downloadCount: 98000,
    rating: 4.7,
    tags: ['spreadsheet', 'data', 'google', 'productivity'],
    documentation: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/',
    parameters: [
      {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        required: true,
        description: 'Method of authentication',
        options: [
          { name: 'OAuth2', value: 'googleSheetsOAuth2Api' },
          { name: 'Service Account', value: 'googleApi' }
        ]
      },
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        description: 'Operation to perform',
        options: [
          { name: 'Append', value: 'append' },
          { name: 'Read', value: 'read' },
          { name: 'Update', value: 'update' },
          { name: 'Clear', value: 'clear' }
        ]
      },
      {
        name: 'spreadsheetId',
        displayName: 'Spreadsheet ID',
        type: 'string',
        required: true,
        description: 'ID of the Google Spreadsheet',
        placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      },
      {
        name: 'range',
        displayName: 'Range',
        type: 'string',
        required: true,
        description: 'Range to read/write (A1 notation)',
        placeholder: 'Sheet1!A1:D10'
      }
    ],
    credentials: [
      {
        name: 'googleSheetsOAuth2Api',
        displayName: 'Google Sheets OAuth2',
        required: true,
        description: 'OAuth2 authentication for Google Sheets',
        properties: [
          {
            name: 'clientId',
            displayName: 'Client ID',
            type: 'string',
            required: true,
            description: 'OAuth2 Client ID from Google Cloud Console'
          },
          {
            name: 'clientSecret',
            displayName: 'Client Secret',
            type: 'password',
            required: true,
            description: 'OAuth2 Client Secret from Google Cloud Console'
          }
        ]
      }
    ],
    usageGuide: {
      overview: 'The Google Sheets node enables you to read, write, and manipulate data in Google Spreadsheets.',
      steps: [
        'Create a project in Google Cloud Console',
        'Enable the Google Sheets API',
        'Create OAuth2 credentials',
        'Configure authentication in N8N',
        'Specify the spreadsheet ID and range for operations'
      ],
      tips: [
        'Use A1 notation for ranges (e.g., A1:D10)',
        'Share your spreadsheet with the service account email',
        'Consider using named ranges for better maintainability',
        'Test with a copy of your data first'
      ],
      commonUses: [
        'Import data from sheets into workflows',
        'Export workflow results to spreadsheets',
        'Create automated reports',
        'Sync data between systems and sheets'
      ]
    },
    examples: [
      {
        title: 'Read Data',
        description: 'Read data from a specific range',
        configuration: {
          operation: 'read',
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          range: 'Sheet1!A1:D10'
        }
      },
      {
        title: 'Append Row',
        description: 'Add new data to the end of a sheet',
        configuration: {
          operation: 'append',
          spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          range: 'Sheet1!A1:D1',
          values: [['John', 'Doe', 'john@example.com', '2024-01-15']]
        }
      }
    ],
    lastUpdated: new Date('2024-01-10')
  },
  {
    id: 'webhook-node',
    name: 'Webhook',
    displayName: 'Webhook',
    description: 'Receive HTTP requests to trigger workflows',
    category: 'Core',
    subcategory: 'Triggers',
    icon: '🔗',
    color: '#FF6B6B',
    version: 1,
    author: 'N8N Team',
    verified: true,
    downloadCount: 200000,
    rating: 4.9,
    tags: ['trigger', 'http', 'webhook', 'api'],
    documentation: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/',
    parameters: [
      {
        name: 'httpMethod',
        displayName: 'HTTP Method',
        type: 'options',
        required: true,
        default: 'GET',
        description: 'HTTP method to listen for',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' }
        ]
      },
      {
        name: 'path',
        displayName: 'Path',
        type: 'string',
        required: true,
        description: 'The path for the webhook URL',
        placeholder: 'webhook-path'
      },
      {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        required: false,
        description: 'Authentication method for the webhook',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Header Auth', value: 'headerAuth' }
        ]
      },
      {
        name: 'responseMode',
        displayName: 'Response Mode',
        type: 'options',
        required: true,
        default: 'onReceived',
        description: 'When to respond to the webhook',
        options: [
          { name: 'On Received', value: 'onReceived' },
          { name: 'Last Node', value: 'lastNode' },
          { name: 'Response Code', value: 'responseCode' }
        ]
      }
    ],
    credentials: [],
    usageGuide: {
      overview: 'The Webhook node acts as a trigger that starts workflows when HTTP requests are received.',
      steps: [
        'Add a Webhook node as the first node in your workflow',
        'Configure the HTTP method and path',
        'Set up authentication if needed',
        'Copy the generated webhook URL',
        'Configure external services to send requests to this URL',
        'Test by sending a request to the webhook URL'
      ],
      tips: [
        'Use meaningful path names for easier management',
        'Consider authentication for sensitive workflows',
        'Test webhooks using tools like Postman or curl',
        'Monitor webhook execution in the N8N interface'
      ],
      commonUses: [
        'Receive data from external applications',
        'Trigger workflows from form submissions',
        'Process incoming API calls',
        'Handle notifications from third-party services'
      ]
    },
    examples: [
      {
        title: 'Simple GET Webhook',
        description: 'Basic webhook that accepts GET requests',
        configuration: {
          httpMethod: 'GET',
          path: 'simple-webhook',
          authentication: 'none',
          responseMode: 'onReceived'
        }
      },
      {
        title: 'Secure POST Webhook',
        description: 'POST webhook with authentication',
        configuration: {
          httpMethod: 'POST',
          path: 'secure-data-handler',
          authentication: 'headerAuth',
          responseMode: 'lastNode'
        }
      }
    ],
    lastUpdated: new Date('2024-01-20')
  },
  {
    id: 'github-node',
    name: 'GitHub',
    displayName: 'GitHub',
    description: 'Interact with GitHub repositories, issues, pull requests, and more',
    category: 'Development',
    subcategory: 'Version Control',
    icon: '🐙',
    color: '#24292e',
    version: 1,
    author: 'N8N Team',
    verified: true,
    downloadCount: 75000,
    rating: 4.6,
    tags: ['git', 'repository', 'issues', 'pull requests', 'development'],
    documentation: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.github/',
    parameters: [
      {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        required: true,
        description: 'Method of authentication',
        options: [
          { name: 'Access Token', value: 'githubApi' },
          { name: 'OAuth2', value: 'githubOAuth2Api' }
        ]
      },
      {
        name: 'resource',
        displayName: 'Resource',
        type: 'options',
        required: true,
        description: 'Resource to operate on',
        options: [
          { name: 'Issue', value: 'issue' },
          { name: 'Repository', value: 'repository' },
          { name: 'Pull Request', value: 'pullRequest' },
          { name: 'Release', value: 'release' }
        ]
      },
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        required: true,
        description: 'Operation to perform',
        options: [
          { name: 'Create', value: 'create' },
          { name: 'Get', value: 'get' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' }
        ]
      },
      {
        name: 'owner',
        displayName: 'Repository Owner',
        type: 'string',
        required: true,
        description: 'Owner of the repository',
        placeholder: 'n8n-io'
      },
      {
        name: 'repository',
        displayName: 'Repository Name',
        type: 'string',
        required: true,
        description: 'Name of the repository',
        placeholder: 'n8n'
      }
    ],
    credentials: [
      {
        name: 'githubApi',
        displayName: 'GitHub Personal Access Token',
        required: true,
        description: 'Personal Access Token for GitHub API',
        properties: [
          {
            name: 'accessToken',
            displayName: 'Access Token',
            type: 'password',
            required: true,
            description: 'GitHub Personal Access Token with appropriate scopes'
          }
        ]
      }
    ],
    usageGuide: {
      overview: 'The GitHub node allows you to interact with GitHub repositories, manage issues, pull requests, and more.',
      steps: [
        'Generate a Personal Access Token in GitHub Settings',
        'Configure the token with necessary scopes (repo, issues, etc.)',
        'Add GitHub credentials in N8N with your access token',
        'Select the resource and operation you want to perform',
        'Specify the repository owner and name',
        'Configure additional parameters as needed'
      ],
      tips: [
        'Use specific scopes for your access token based on operations needed',
        'Consider using organization tokens for team repositories',
        'Test operations on a test repository first',
        'Be mindful of rate limits when making multiple API calls'
      ],
      commonUses: [
        'Automatically create issues from form submissions',
        'Update issue status based on external events',
        'Create releases when workflows complete',
        'Sync repository data with external systems'
      ]
    },
    examples: [
      {
        title: 'Create Issue',
        description: 'Create a new issue in a repository',
        configuration: {
          resource: 'issue',
          operation: 'create',
          owner: 'n8n-io',
          repository: 'n8n',
          title: 'Bug Report from Workflow',
          body: 'Issue automatically created by N8N workflow'
        }
      },
      {
        title: 'Get Repository Info',
        description: 'Fetch information about a repository',
        configuration: {
          resource: 'repository',
          operation: 'get',
          owner: 'n8n-io',
          repository: 'n8n'
        }
      }
    ],
    lastUpdated: new Date('2024-01-12')
  },
  {
    id: 'email-node',
    name: 'Send Email',
    displayName: 'Send Email',
    description: 'Send emails via SMTP or email service providers',
    category: 'Communication',
    subcategory: 'Email',
    icon: '✉️',
    color: '#EA4335',
    version: 2,
    author: 'N8N Team',
    verified: true,
    downloadCount: 150000,
    rating: 4.8,
    tags: ['email', 'smtp', 'communication', 'notifications'],
    documentation: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailsend/',
    parameters: [
      {
        name: 'fromEmail',
        displayName: 'From Email',
        type: 'string',
        required: true,
        description: 'Email address to send from',
        placeholder: 'sender@example.com'
      },
      {
        name: 'toEmail',
        displayName: 'To Email',
        type: 'string',
        required: true,
        description: 'Recipient email address(es)',
        placeholder: 'recipient@example.com'
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        required: true,
        description: 'Email subject line',
        placeholder: 'Your subject here'
      },
      {
        name: 'text',
        displayName: 'Email Text',
        type: 'string',
        required: false,
        description: 'Plain text email content'
      },
      {
        name: 'html',
        displayName: 'Email HTML',
        type: 'string',
        required: false,
        description: 'HTML email content'
      },
      {
        name: 'attachments',
        displayName: 'Attachments',
        type: 'fixedCollection',
        required: false,
        description: 'Email attachments'
      }
    ],
    credentials: [
      {
        name: 'smtp',
        displayName: 'SMTP',
        required: true,
        description: 'SMTP server configuration for sending emails',
        properties: [
          {
            name: 'host',
            displayName: 'Host',
            type: 'string',
            required: true,
            description: 'SMTP server hostname'
          },
          {
            name: 'port',
            displayName: 'Port',
            type: 'string',
            required: true,
            description: 'SMTP server port (usually 587 or 465)'
          },
          {
            name: 'secure',
            displayName: 'SSL/TLS',
            type: 'string',
            required: true,
            description: 'Use SSL/TLS encryption'
          },
          {
            name: 'user',
            displayName: 'Username',
            type: 'string',
            required: true,
            description: 'SMTP username'
          },
          {
            name: 'password',
            displayName: 'Password',
            type: 'password',
            required: true,
            description: 'SMTP password or app password'
          }
        ]
      }
    ],
    usageGuide: {
      overview: 'The Send Email node allows you to send emails through SMTP servers or email service providers.',
      steps: [
        'Configure SMTP credentials for your email provider',
        'Set the sender and recipient email addresses',
        'Write your email subject and content (text and/or HTML)',
        'Add attachments if needed',
        'Test the email configuration',
        'Connect to your workflow trigger or previous nodes'
      ],
      tips: [
        'Use app-specific passwords for Gmail and similar services',
        'Test with a personal email first before sending to customers',
        'Consider HTML formatting for better email presentation',
        'Be mindful of attachment size limits'
      ],
      commonUses: [
        'Send workflow completion notifications',
        'Deliver automated reports and summaries',
        'Alert administrators about system events',
        'Send personalized emails to customers'
      ]
    },
    examples: [
      {
        title: 'Simple Text Email',
        description: 'Send a basic text email notification',
        configuration: {
          fromEmail: 'noreply@company.com',
          toEmail: 'admin@company.com',
          subject: 'Workflow Completed',
          text: 'Your automated workflow has completed successfully.'
        }
      },
      {
        title: 'HTML Email with Formatting',
        description: 'Send a formatted HTML email',
        configuration: {
          fromEmail: 'reports@company.com',
          toEmail: 'team@company.com',
          subject: 'Daily Report',
          html: '<h2>Daily Report</h2><p>Find attached today\'s metrics and analysis.</p>'
        }
      }
    ],
    lastUpdated: new Date('2024-01-18')
  }
];

export const nodeCategories = [
  'All',
  'Communication',
  'Productivity', 
  'Development',
  'Core',
  'Data Storage',
  'Marketing',
  'Finance',
  'Analytics'
];

export const nodeSubcategories: Record<string, string[]> = {
  'Communication': ['Team Chat', 'Email', 'Social Media', 'Video Conferencing'],
  'Productivity': ['Spreadsheets', 'Documents', 'Task Management', 'Calendar'],
  'Development': ['Version Control', 'CI/CD', 'Monitoring', 'Testing'],
  'Core': ['Triggers', 'Utilities', 'Logic', 'Data Transformation'],
  'Data Storage': ['Databases', 'File Storage', 'Cloud Storage'],
  'Marketing': ['Email Marketing', 'CRM', 'Analytics', 'Social Media'],
  'Finance': ['Payment Processing', 'Accounting', 'Banking', 'Invoicing'],
  'Analytics': ['Web Analytics', 'Business Intelligence', 'Reporting']
};