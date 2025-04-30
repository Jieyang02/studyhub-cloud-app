# Trash Cleanup Task

This directory contains scheduled tasks for the StudyHub application. Currently, it includes:

- `cleanup_trash.py`: A script to permanently delete expired trash items (those older than 30 days)

## Deploying as a Google Cloud Function

The trash cleanup task is designed to run on a schedule to automatically remove expired trash items. Here's how to deploy it as a Google Cloud Function:

### Prerequisites

- Google Cloud Platform account with billing enabled
- Google Cloud SDK installed and configured
- Firebase project connected to your application

### Deployment Steps

1. Create a `requirements.txt` file in this directory with the following dependencies:

```
firebase-admin>=5.3.0
```

2. Deploy the function using the Google Cloud SDK:

```bash
gcloud functions deploy cleanup_expired_trash_items \
  --runtime python39 \
  --trigger-topic daily-trash-cleanup \
  --source . \
  --entry-point cleanup_expired_trash_items
```

3. Set up a Cloud Scheduler job to trigger the function daily:

```bash
gcloud scheduler jobs create pubsub daily-trash-cleanup-job \
  --schedule "0 0 * * *" \
  --topic daily-trash-cleanup \
  --message-body "Cleanup expired trash items"
```

This will run the cleanup task daily at midnight.

## Running Locally for Testing

You can test the cleanup task locally by running:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
python cleanup_trash.py
```

Make sure you have set up the service account credentials with proper permissions to access your Firestore database.

## Configuration

The cleanup task will delete all trash items with an `expiresAt` timestamp in the past. By default, items are set to expire 30 days after deletion, as configured in the main application.

To modify the expiration period, change the `calculate_future_date` function call in the subject and note deletion routes.
