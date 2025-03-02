const BASE_URL = process.env.NEXT_PUBLIC_API_BACKEND_URL;

export async function joinWaitlist(email: string) {
  try {
    const response = await fetch(`${BASE_URL}/v1/api/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to join waitlist');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function getWaitlist() {
  try {
    const response = await fetch(`${BASE_URL}/v1/api/waitlist`);
    
    if (!response.ok) {
      throw new Error('Failed to get waitlist');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}
