import {
  getDatabaseStructure,
  DatabaseStructureResponse
} from '../../../src/api';

import { ServerConnection } from '@jupyterlab/services';

jest.mock('@jupyterlab/services', () => ({
  ServerConnection: {
    defaultSettings: {
      baseUrl: 'https://example.com'
    },
    makeRequest: jest.fn()
  }
}));

namespace Fixtures {
  export const success = {
    responseType: 'success',
    responseData: {
      tables: ['t1', 't2']
    }
  };

  export const successResponse = new Response(JSON.stringify(success));

  export const error = {
    responseType: 'error',
    responseData: {
      message: 'some message'
    }
  };

  export const errorResponse = new Response(JSON.stringify(error));
}

describe('getDatabaseStructure', () => {
  const testCases: Array<Array<any>> = [
    ['success', Fixtures.success],
    ['error', Fixtures.error]
  ];

  it.each(testCases)('valid %#: %s', async (_, response) => {
    ServerConnection.makeRequest = jest.fn(() =>
      Promise.resolve(new Response(JSON.stringify(response)))
    );

    const result = await getDatabaseStructure('connectionUrl');
    expect(result).toEqual(response);
    const expectedUrl = 'https://example.com/jupyterlab-sql/database';
    const expectedRequest = {
      method: 'POST',
      body: JSON.stringify({ connectionUrl: 'connectionUrl' })
    };

    expect(ServerConnection.makeRequest).toHaveBeenCalledWith(
      expectedUrl,
      expectedRequest,
      ServerConnection.defaultSettings
    );
  });

  it('matching on success', async () => {
    ServerConnection.makeRequest = jest.fn(() =>
      Promise.resolve(Fixtures.successResponse)
    );

    const result = await getDatabaseStructure('connectionUrl');

    const mockOnSuccess = jest.fn();
    DatabaseStructureResponse.match(result, mockOnSuccess, jest.fn());

    expect(mockOnSuccess).toHaveBeenCalledWith(
      Fixtures.success.responseData.tables
    );
  });

  it('matching on error', async () => {
    ServerConnection.makeRequest = jest.fn(() =>
      Promise.resolve(Fixtures.errorResponse)
    );

    const result = await getDatabaseStructure('connectionUrl');

    const mockOnError = jest.fn();
    DatabaseStructureResponse.match(result, jest.fn(), mockOnError);

    expect(mockOnError).toHaveBeenCalledWith(Fixtures.error.responseData);
  });

  it('bad http status code', async () => {
    ServerConnection.makeRequest = jest.fn(() =>
      Promise.resolve(new Response('', { status: 400 }))
    );
    const result = await getDatabaseStructure('connectionUrl');
    const mockOnError = jest.fn();
    DatabaseStructureResponse.match(result, jest.fn(), mockOnError);
    expect(mockOnError).toHaveBeenCalled();
    const [[{ message }]] = mockOnError.mock.calls;
    expect(message).toMatch(/response status/);
  });
});
