const { coreV1, appsV1, networkingV1 } = require('./client');

const WP_SETUP_SCRIPT = `#!/bin/bash
set -e

echo "=== WooCommerce Setup Script ==="

# Wait for DB (proper poll, no sleep)
until nc -z \${WORDPRESS_DB_HOST%:*} \${WORDPRESS_DB_HOST#*:} 2>/dev/null; do
  echo "Waiting for MySQL..." && sleep 3
done
sleep 5

# Core install
if [ ! -f /var/www/html/wp-config.php ]; then
  wp core download --allow-root --skip-content

  wp config create \\
    --dbname="\${WORDPRESS_DB_NAME}" \\
    --dbuser="\${WORDPRESS_DB_USER}" \\
    --dbpass="\${WORDPRESS_DB_PASSWORD}" \\
    --dbhost="\${WORDPRESS_DB_HOST}" \\
    --allow-root

  wp config set WP_HOME "\${WP_SITE_URL}" --type=constant --allow-root
  wp config set WP_SITEURL "\${WP_SITE_URL}" --type=constant --allow-root

  wp core install \\
    --url="\${WP_SITE_URL}" \\
    --title="\${WP_SITE_TITLE}" \\
    --admin_user="\${WP_ADMIN_USER}" \\
    --admin_password="\${WP_ADMIN_PASSWORD}" \\
    --admin_email="\${WP_ADMIN_EMAIL}" \\
    --skip-email \\
    --allow-root
fi

# Theme and plugins
wp theme install /wp-cache/storefront.zip --activate --allow-root
wp plugin install /wp-cache/woocommerce.zip --activate --allow-root

# WooCommerce pages
wp wc tool run install_pages --user="\${WP_ADMIN_USER}" --allow-root 2>/dev/null || true

# Set shop as home
SHOP_ID=$(wp post list --post_type=page --name=shop --format=ids --allow-root | head -n 1)
if [ -n "$SHOP_ID" ]; then
  wp option update show_on_front 'page' --allow-root
  wp option update page_on_front $SHOP_ID --allow-root
fi

# Currency and payment
wp option update woocommerce_currency "\${WC_STORE_CURRENCY}" --allow-root
wp option update woocommerce_cod_settings '{"enabled":"yes","title":"Cash on Delivery","description":"Pay upon delivery."}' --format=json --allow-root

# Add products from SAMPLE_PRODUCTS (pipe-delimited, newline-separated)
while IFS='|' read -r name price description; do
  name=$(echo "$name" | xargs)
  price=$(echo "$price" | xargs)
  desc=$(echo "$description" | xargs)
  if [ -n "$name" ] && [ -n "$price" ]; then
    SLUG=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    if ! wp post list --post_type=product --name="$SLUG" --format=ids --allow-root | grep -q .; then
      wp wc product create \\
        --name="$name" \\
        --type=simple \\
        --regular_price="$price" \\
        --description="$desc" \\
        --status=publish \\
        --user="\${WP_ADMIN_USER}" \\
        --allow-root
      echo "Added product: $name"
    fi
  fi
done <<< "\$SAMPLE_PRODUCTS"

wp transient delete --all --allow-root

echo "=== SETUP COMPLETE ==="
`;

async function createConfigMap(namespace, storeUrl, storeName, adminPassword, products) {
  const spec = {
    metadata: { name: 'wordpress-config', namespace },
    data: {
      WP_ADMIN_USER: 'admin',
      WP_ADMIN_PASSWORD: adminPassword,
      WP_ADMIN_EMAIL: 'admin@store.com',
      WP_SITE_TITLE: storeName,
      WP_SITE_URL: storeUrl.startsWith('http') ? storeUrl : `http://${storeUrl}`,
      WC_STORE_NAME: storeName,
      WC_STORE_CURRENCY: 'INR',
      SAMPLE_PRODUCTS: products,
    },
  };
  try {
    await coreV1.createNamespacedConfigMap(namespace, spec);
    console.log('✓ wordpress-config created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create wordpress-config: ${err.message}`);
  }
}

async function createSetupScriptConfigMap(namespace) {
  const spec = {
    metadata: { name: 'wp-setup-script', namespace },
    data: { 'wp-setup.sh': WP_SETUP_SCRIPT },
  };
  try {
    await coreV1.createNamespacedConfigMap(namespace, spec);
    console.log('✓ wp-setup-script created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create wp-setup-script: ${err.message}`);
  }
}

async function createPVC(namespace, storageGi) {
  const spec = {
    metadata: { name: 'wordpress-pvc', namespace },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: { requests: { storage: `${storageGi}Gi` } },
    },
  };
  try {
    await coreV1.createNamespacedPersistentVolumeClaim(namespace, spec);
    console.log('✓ wordpress-pvc created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create wordpress PVC: ${err.message}`);
  }
}

async function createDeployment(namespace, storeUrl) {
  const dbEnv = [
    { name: 'WORDPRESS_DB_HOST', value: 'mysql:3306' },
    { name: 'WORDPRESS_DB_NAME', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-database' } } },
    { name: 'WORDPRESS_DB_USER', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-user' } } },
    { name: 'WORDPRESS_DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'mysql-secret', key: 'mysql-password' } } },
  ];

  const storeUrlFull = storeUrl.startsWith('http') ? storeUrl : `http://${storeUrl}`;

  const spec = {
    metadata: { name: 'wordpress', namespace, labels: { app: 'wordpress' } },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: 'wordpress' } },
      template: {
        metadata: { labels: { app: 'wordpress' } },
        spec: {
          initContainers: [{
            name: 'wp-init',
            image: 'kubecart/wp-prebaked:latest',
            imagePullPolicy: 'Never',
            command: ['/bin/bash', '-c',
              'mkdir -p /tmp/conf.d && echo "memory_limit = 512M" > /tmp/conf.d/custom.ini && ' +
              'export PHP_INI_SCAN_DIR=:$PHP_INI_SCAN_DIR:/tmp/conf.d && ' +
              '/scripts/wp-setup.sh 2>&1 | grep -v "already loaded"'
            ],
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '500m', memory: '512Mi' },
            },
            env: dbEnv,
            envFrom: [{ configMapRef: { name: 'wordpress-config' } }],
            volumeMounts: [
              { name: 'wordpress-storage', mountPath: '/var/www/html' },
              { name: 'setup-script', mountPath: '/scripts' },
            ],
          }],
          containers: [{
            name: 'wordpress',
            image: 'wordpress:latest',
            resources: {
              requests: { cpu: '100m', memory: '256Mi' },
              limits: { cpu: '500m', memory: '512Mi' },
            },
            ports: [{ containerPort: 80, name: 'http' }],
            env: [
              ...dbEnv,
              {
                name: 'WORDPRESS_CONFIG_EXTRA',
                value: `define('WP_HOME', '${storeUrlFull}');\ndefine('WP_SITEURL', '${storeUrlFull}');\n`,
              },
            ],
            envFrom: [{ configMapRef: { name: 'wordpress-config' } }],
            volumeMounts: [{ name: 'wordpress-storage', mountPath: '/var/www/html' }],
          }],
          volumes: [
            { name: 'wordpress-storage', persistentVolumeClaim: { claimName: 'wordpress-pvc' } },
            { name: 'setup-script', configMap: { name: 'wp-setup-script', defaultMode: 0o755 } },
          ],
        },
      },
    },
  };

  try {
    await appsV1.createNamespacedDeployment(namespace, spec);
    console.log('✓ wordpress deployment created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create wordpress deployment: ${err.message}`);
  }
}

async function createService(namespace) {
  const spec = {
    metadata: { name: 'wordpress', namespace, labels: { app: 'wordpress' } },
    spec: {
      selector: { app: 'wordpress' },
      ports: [{ port: 80, targetPort: 80, protocol: 'TCP', name: 'http' }],
      type: 'ClusterIP',
    },
  };
  try {
    await coreV1.createNamespacedService(namespace, spec);
    console.log('✓ wordpress service created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create wordpress service: ${err.message}`);
  }
}

async function createIngress(namespace, storeHost) {
  // Strip protocol if present
  const host = storeHost.replace(/^https?:\/\//, '');
  const spec = {
    metadata: {
      name: 'store-ingress',
      namespace,
      annotations: {
        'nginx.ingress.kubernetes.io/proxy-body-size': '50m',
        'nginx.ingress.kubernetes.io/ssl-redirect': 'false', // localhost dev: no SSL
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTP',
      },
    },
    spec: {
      ingressClassName: 'nginx',
      rules: [{
        host,
        http: {
          paths: [{
            path: '/',
            pathType: 'Prefix',
            backend: {
              service: { name: 'wordpress', port: { number: 80 } },
            },
          }],
        },
      }],
    },
  };
  try {
    await networkingV1.createNamespacedIngress(namespace, spec);
    console.log('✓ ingress created');
  } catch (err) {
    if (err.response?.statusCode === 409) return;
    throw new Error(`Failed to create ingress: ${err.message}`);
  }
}

module.exports = {
  createConfigMap,
  createSetupScriptConfigMap,
  createPVC,
  createDeployment,
  createService,
  createIngress,
};
