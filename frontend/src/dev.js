// Flip DEV_BYPASS_AUTH to false when backend is running
export const DEV_BYPASS_AUTH = false;

export const MOCK_USER = {
  username: 'dev_user',
  current_stores: 2,
  max_stores: 5,
  current_storage: 6,
  max_storage: 20,
};

export const MOCK_STORES = [
  {
    id: 'store-001',
    store_name: 'Urban Outfitters',
    status: 'running',
    url: 'http://store-001.storefactory.local',
    admin_url: 'http://store-001.storefactory.local/wp-admin',
    namespace: 'store-001',
    owner: 'dev_user',
    storage_gi: 3,
    created_at: new Date().toISOString(),
    admin_user: 'admin',
    admin_password: 'mock-password-123',
  },
  {
    id: 'store-002',
    store_name: 'Tech Haven',
    status: 'provisioning',
    url: 'http://store-002.storefactory.local',
    admin_url: 'http://store-002.storefactory.local/wp-admin',
    namespace: 'store-002',
    owner: 'dev_user',
    storage_gi: 4,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    admin_user: 'admin',
    admin_password: 'mock-password-456',
  },
  {
    id: 'store-003',
    store_name: "Nature's Best",
    status: 'failed',
    url: 'http://store-003.storefactory.local',
    admin_url: 'http://store-003.storefactory.local/wp-admin',
    namespace: 'store-003',
    owner: 'dev_user',
    storage_gi: 2,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    admin_user: 'admin',
    admin_password: 'mock-password-789',
  },
];
