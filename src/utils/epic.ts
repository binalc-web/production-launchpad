import axiosInstance from '@/api/axios';

const CLIENT_ID = import.meta.env.VITE_EPIC_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_EPIC_REDIRECT_URI;
const SCOPES =
  'patient/DocumentReference.read patient/Binary.read patient/*.read openid fhirUser offline_access launch/patient';
const SMART_CONFIGURATION_ENDPOINT = '/.well-known/smart-configuration';
interface SmartConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  token_endpoint_auth_methods_supported: Array<string>;
  scopes_supported: Array<string>;
  response_types_supported: Array<string>;
  capabilities: Array<string>;
  grant_types_supported: Array<string>;
  code_challenge_methods_supported: Array<string>;
  issuer: string;
  jwks_uri: string;
}

/**
 * Generates a unique Epic state string based on the current timestamp and a random string.
 * The generated state is stored in local storage under the key 'epic_state'.
 * @returns {string} The generated Epic state string
 */
export const epicStateGenerator = (): string => {
  const state = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem('epic_state', state);
  return state;
};
/**
 * Fetches the Smart Configuration from the Epic FHIR server and redirects the user to the Epic authorization page with the required parameters.
 * @param baseUrl - The base URL of the Epic FHIR server
 */
export const handleEpicLogin = async (baseUrl: string): Promise<void> => {
  try {
    const smartConfigurations = await axiosInstance.get<SmartConfiguration>(
      `${baseUrl.replace(/\/$/, '')}${SMART_CONFIGURATION_ENDPOINT}`
    );
    // Store the base URL for use during the callback token exchange
    localStorage.setItem('epicBaseUrl', baseUrl);
    // Store the token_endpoint for use during the callback token exchange
    if (smartConfigurations.data.token_endpoint) {
      localStorage.setItem(
        'epicTokenEndpoint',
        smartConfigurations.data.token_endpoint
      );
    } else {
      throw new Error('Token endpoint not found');
    }

    const url = new URL(
      `${smartConfigurations.data.authorization_endpoint.replace(/\/$/, '')}`
    );

    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', CLIENT_ID);
    url.searchParams.append('redirect_uri', REDIRECT_URI);
    url.searchParams.append('scope', SCOPES);
    url.searchParams.append('state', epicStateGenerator());
    url.searchParams.append('aud', baseUrl);
    window.open(url.toString(), '_self');
  } catch (error) {
    console.log('error====>', error);
    throw error;
  }
};
