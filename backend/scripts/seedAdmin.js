

console.error(
  "This legacy script is disabled because it provisioned a fixed-password administrator. " +
    "Use `npm run provision-superadmin -- --email <existing-admin-email> --confirm` instead."
);
process.exitCode = 1;
