# WeTransfer UI

A modern React-based frontend for the WeTransfer clone.

## Prerequisites
- Node.js (v18+)
- NPM or Yarn
- Go Backend running on port 8080

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser at `http://localhost:5173` (or the port shown in terminal).

## Features
- **Upload**: Drag & drop support, upload progress bar, direct S3 integration.
- **Success**: Shareable links for your transfers.
- **Download**: Clean download page with expiry info.
- **Dashboard**: View history of your transfers.

## Architecture
- **Vite**: Build tool.
- **React**: UI Library.
- **Vanilla CSS**: Component-scoped and variable-based styling.
- **Framer Motion**: Animations.
- **Axios**: API requests.
