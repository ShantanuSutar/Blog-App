import cron from 'node-cron';
import { db } from './db.js';
import { sendNewPostNotification } from './utils/email.js';

// Schedule a job to run every minute
export const schedulePostPublisher = () => {
  console.log('Starting scheduled post publisher cron job...');
  
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('Running scheduled post check at:', new Date().toISOString());
    
    try {
      // Find all posts that should be published now (scheduled time has passed)
      const selectQuery = `
        SELECT id, title, uid FROM posts 
        WHERE draft = true 
          AND scheduled_publish_date IS NOT NULL 
          AND scheduled_publish_date <= timezone('UTC', now())
      `;
      
      const postsToPublish = await db.query(selectQuery);
      
      if (postsToPublish.rows.length > 0) {
        // Update posts to publish them
        const updateQuery = `
          UPDATE posts 
          SET draft = false, scheduled_publish_date = NULL 
          WHERE draft = true 
            AND scheduled_publish_date IS NOT NULL 
            AND scheduled_publish_date <= timezone('UTC', now())
          RETURNING id, title
        `;
        
        const result = await db.query(updateQuery);
        
        console.log(`Published ${result.rows.length} scheduled post(s):`);
        result.rows.forEach(post => {
          console.log(`  - Post ID: ${post.id}, Title: ${post.title}`);
        });
        
        // Send email notifications for each published post
        try {
          const subscribersQuery = "SELECT email FROM subscribers";
          const subscribersResult = await db.query(subscribersQuery);
          const subscriberEmails = subscribersResult.rows.map(row => row.email);
          
          if (subscriberEmails.length > 0) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://unsaid-stories-and-more.vercel.app';
            
            for (const post of result.rows) {
              const postUrl = `${frontendUrl}/post/${post.id}`;
              
              sendNewPostNotification(subscriberEmails, post.title, postUrl)
                .then(emailResult => {
                  if (emailResult.success) {
                    console.log(`Notified ${subscriberEmails.length} subscribers about scheduled post: ${post.title}`);
                  } else {
                    console.warn('Failed to send scheduled post notification:', emailResult.error);
                  }
                })
                .catch(err => {
                  console.error('Error sending scheduled post notification:', err);
                });
            }
          }
        } catch (notifErr) {
          console.error('Error preparing scheduled post notification:', notifErr);
        }
      } else {
        console.log('No posts scheduled for publication at this time.');
      }
    } catch (err) {
      console.error('Error in scheduled post publisher:', err);
    }
  });
  
  console.log('Scheduled post publisher cron job initialized successfully!');
};
