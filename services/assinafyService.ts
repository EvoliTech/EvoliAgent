// services/assinafyService.ts

const API_BASE_URL = 'https://sandbox.assinafy.com.br/v1';

// Assinafy requires API Key for backend integrations
// The account ID and API Key will be read from environment variables.
// Users must add VITE_ASSINAFY_API_KEY and VITE_ASSINAFY_ACCOUNT_ID to their .env file.
const getHeaders = () => {
  const apiKey = import.meta.env.VITE_ASSINAFY_API_KEY;
  if (!apiKey) {
    console.error('VITE_ASSINAFY_API_KEY not set in .env');
  }
  return {
    'X-Api-Key': apiKey || '',
  };
};

const getAccountId = () => {
  const accountId = import.meta.env.VITE_ASSINAFY_ACCOUNT_ID;
  if (!accountId) {
    console.error('VITE_ASSINAFY_ACCOUNT_ID not set in .env');
  }
  return accountId || '';
};

export const assinafyService = {
  /**
   * Upload a PDF file to create a document in Assinafy.
   */
  async createDocument(file: Blob, name: string): Promise<string | null> {
    const accountId = getAccountId();
    if (!accountId) return null;

    const formData = new FormData();
    formData.append('file', file, name);

    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const resData = await response.json();
      return resData.data.id;
    } catch (error) {
      console.error('Assinafy createDocument error:', error);
      return null;
    }
  },

  /**
   * Create a signer in the workspace.
   * Accepts optional whatsapp_phone_number in E.164 format (+5511999991234).
   */
  async createSigner(fullName: string, email: string, whatsappPhone?: string): Promise<string | null> {
    const accountId = getAccountId();
    if (!accountId) return null;

    const body: any = { full_name: fullName };
    if (email) body.email = email;
    if (whatsappPhone) body.whatsapp_phone_number = whatsappPhone;

    try {
      const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/signers`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to create signer: ${response.statusText}`);
      }

      const resData = await response.json();
      return resData.data.id;
    } catch (error) {
      console.error('Assinafy createSigner error:', error);
      return null;
    }
  },

  /**
   * Request signature (create an assignment) using the virtual method.
   * method: 'email' uses Email verification (free), 'whatsapp' uses WhatsApp (paid plan required).
   * Returns the signing URL.
   */
  async createAssignment(
    documentId: string,
    signerId: string,
    notificationMethod: 'Email' | 'Whatsapp' = 'Email'
  ): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/assignments`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'virtual',
          signers: [
            {
              id: signerId,
              step: 1,
              verification_method: notificationMethod,
              notification_methods: [notificationMethod],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create assignment: ${response.statusText}`);
      }

      const resData = await response.json();

      // Look for the signing URL for this signer
      const signingUrl = resData.data.signing_urls?.find((u: any) => u.signer_id === signerId)?.url;
      return signingUrl || null;
    } catch (error) {
      console.error('Assinafy createAssignment error:', error);
      return null;
    }
  },

  /**
   * Check the status of a document.
   */
  async getDocumentStatus(documentId: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const resData = await response.json();
      return resData.data.status;
    } catch (error) {
      console.error('Assinafy getDocumentStatus error:', error);
      return null;
    }
  }
};
