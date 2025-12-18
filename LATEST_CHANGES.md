# Latest Changes

## Bluetooth Permissions Fix
- **Issue:** The password prompt for Bluetooth was not appearing because the specific error message "Bluetooth requires administrator privileges" was not being detected as a permission error.
- **Fix:** Updated the error detection regex in `src/main.ts` to include "administrator", "root", and "denied".
- **Result:** When enabling Bluetooth requires sudo privileges, the application will now correctly prompt you for your password.

## Instructions
1. **Restart the Application:** Please restart the application (stop and run `npm run dev` again) to ensure all changes are applied.
2. **Verify Bluetooth:** Try toggling Bluetooth. If elevated privileges are required, you should now see a password prompt.
