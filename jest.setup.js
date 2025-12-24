// Jest setup file for mocking React Native modules

// In-memory storage mock for AsyncStorage
let mockStorage = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key, value) => {
    return new Promise((resolve) => {
      mockStorage[key] = value;
      resolve(null);
    });
  }),
  getItem: jest.fn((key) => {
    return new Promise((resolve) => {
      resolve(mockStorage[key] || null);
    });
  }),
  removeItem: jest.fn((key) => {
    return new Promise((resolve) => {
      delete mockStorage[key];
      resolve(null);
    });
  }),
  getAllKeys: jest.fn(() => {
    return new Promise((resolve) => {
      resolve(Object.keys(mockStorage));
    });
  }),
  multiRemove: jest.fn((keys) => {
    return new Promise((resolve) => {
      keys.forEach((key) => delete mockStorage[key]);
      resolve(null);
    });
  }),
  clear: jest.fn(() => {
    return new Promise((resolve) => {
      mockStorage = {};
      resolve(null);
    });
  }),
}));

// Reset mock storage before each test
beforeEach(() => {
  mockStorage = {};
});
