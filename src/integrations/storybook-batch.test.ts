import { StorybookBatchRunner } from './storybook-batch';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('StorybookBatchRunner.discoverStories', () => {
  const runner = new StorybookBatchRunner();
  const baseUrl = 'http://localhost:6006';

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('parses index.json (v7+) format', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
      new Response(JSON.stringify({
        entries: {
          'comp--a': { type: 'story', id: 'comp--a', name: 'A' },
          'comp--b': { type: 'story', id: 'comp--b', name: 'B' },
          'meta--c': { type: 'meta', id: 'meta--c', name: 'C' }
        }
      }))
    );
    const stories = await runner.discoverStories(baseUrl);
    expect(stories).toEqual([
      { name: 'A', url: `${baseUrl}/iframe.html?id=comp--a` },
      { name: 'B', url: `${baseUrl}/iframe.html?id=comp--b` }
    ]);
  });

  it('parses stories.json (v6) format', async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockRejectedValueOnce(new Error('index.json not found')) // index.json fails
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          stories: {
            'comp--a': { id: 'comp--a', name: 'A' },
            'comp--b': { id: 'comp--b', name: 'B' }
          }
        }))
      );
    const stories = await runner.discoverStories(baseUrl);
    expect(stories).toEqual([
      { name: 'A', url: `${baseUrl}/iframe.html?id=comp--a` },
      { name: 'B', url: `${baseUrl}/iframe.html?id=comp--b` }
    ]);
  });

  it('returns empty array if no stories found', async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response('{}')) // index.json returns empty
      .mockResolvedValueOnce(new Response('{}'));
    const stories = await runner.discoverStories(baseUrl);
    expect(stories).toEqual([]);
  });
}); 