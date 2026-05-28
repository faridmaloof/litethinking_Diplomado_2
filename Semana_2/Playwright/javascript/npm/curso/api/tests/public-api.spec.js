const { test, expect } = require('@playwright/test');

test.describe('Public API examples', () => {
  test('should fetch one post by id', async ({ request }) => {
    const response = await request.get('https://jsonplaceholder.typicode.com/posts/1');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response;
    expect(data.id).toBe(1);
    expect(data.title).toBeTruthy();
  });

  test('should create a post', async ({ request }) => {
    const response = await request.post('https://jsonplaceholder.typicode.com/posts', {
      data: {
        title: 'curso-api',
        body: 'sample body',
        userId: 10
      }
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.title).toBe('curso-api');
    expect(data.userId).toBe(10);
  });
});
