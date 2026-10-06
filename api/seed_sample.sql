-- Unsaid sample data for PostgreSQL
--
-- WARNING: This script permanently deletes all application data in the
-- currently connected database. It intentionally preserves schema_migrations
-- and the database structure.
--
-- Every sample account uses this development-only password:
--   DemoPass123!

BEGIN;

TRUNCATE TABLE
  activities,
  reactions,
  bookmarks,
  comments,
  follows,
  posts,
  subscribers,
  users
RESTART IDENTITY CASCADE;

INSERT INTO users (username, email, password, avatar, bio, created_at)
VALUES
  (
    'maya_writes',
    'maya.writes@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=47',
    'Essayist writing about quiet routines, creativity, and the internet.',
    CURRENT_TIMESTAMP - INTERVAL '14 months'
  ),
  (
    'arjun_codes',
    'arjun.codes@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=12',
    'Frontend engineer, performance enthusiast, and incurable note-taker.',
    CURRENT_TIMESTAMP - INTERVAL '12 months'
  ),
  (
    'leena_roams',
    'leena.roams@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=32',
    'Slow travel, train windows, neighborhood walks, and field notes.',
    CURRENT_TIMESTAMP - INTERVAL '11 months'
  ),
  (
    'kabir_kitchen',
    'kabir.kitchen@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=68',
    'Home cook documenting forgiving recipes and memorable tables.',
    CURRENT_TIMESTAMP - INTERVAL '10 months'
  ),
  (
    'nora_frames',
    'nora.frames@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=44',
    'Film editor and photographer interested in stories between the cuts.',
    CURRENT_TIMESTAMP - INTERVAL '9 months'
  ),
  (
    'dev_on_track',
    'dev.track@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=15',
    'Amateur runner sharing sustainable training and recovery notes.',
    CURRENT_TIMESTAMP - INTERVAL '8 months'
  ),
  (
    'ira_observes',
    'ira.observes@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=49',
    'Science communicator making everyday systems easier to notice.',
    CURRENT_TIMESTAMP - INTERVAL '7 months'
  ),
  (
    'sam_sketches',
    'sam.sketches@example.com',
    '$2a$12$iJyLp8bOMk7R0HMt9N/S6.V.AF3EJeE8dkCdFCPRA5HDjVvRg2OyW',
    'https://i.pravatar.cc/240?img=11',
    'Illustrator, museum wanderer, and collector of unfinished ideas.',
    CURRENT_TIMESTAMP - INTERVAL '6 months'
  );

INSERT INTO posts (
  title,
  "desc",
  img,
  cat,
  date,
  uid,
  draft,
  scheduled_publish_date,
  tags,
  featured,
  views
)
SELECT
  sample.title,
  sample.description,
  sample.image,
  sample.category,
  CURRENT_TIMESTAMP - sample.published_ago::interval,
  author.id,
  FALSE,
  NULL,
  sample.tags::jsonb,
  sample.featured,
  sample.views
FROM (
  VALUES
    (
      'The Small Interfaces That Make a Product Feel Thoughtful',
      '<p>Good software rarely announces every careful decision. It simply makes the next action feel obvious.</p><h2>Details are part of the product</h2><p>Labels, empty states, keyboard focus, and useful defaults shape trust long before a user notices the larger architecture.</p><blockquote>Polish is not decoration. It is the removal of small uncertainties.</blockquote>',
      'https://picsum.photos/seed/thoughtful-interface/1400/788',
      'technology', '2 days', '["design", "ux", "product"]', TRUE, 1842, 'arjun_codes'
    ),
    (
      'A Quiet Morning Practice for Noisy Weeks',
      '<p>My best mornings are not impressive. They begin with water, an open window, and ten minutes without a screen.</p><h2>A routine that can bend</h2><p>The point is not perfect consistency. The point is having a small place to return to when the week becomes crowded.</p>',
      'https://picsum.photos/seed/quiet-morning/1400/788',
      'art', '3 days', '["creativity", "routine", "reflection"]', TRUE, 1564, 'maya_writes'
    ),
    (
      'Fort Kochi on Foot: A Day Without an Itinerary',
      '<p>We left the hotel with no list and followed the shade. The old streets offered bookshops, ferry horns, painted doors, and lunch when we finally became hungry.</p><h2>Let the neighborhood set the pace</h2><p>Walking without a checklist made the city feel less like a collection of sights and more like a place where people live.</p>',
      'https://picsum.photos/seed/fort-kochi/1400/788',
      'travel', '4 days', '["india", "slow-travel", "walking"]', TRUE, 1430, 'leena_roams'
    ),
    (
      'The Weeknight Tomato Rice I Keep Returning To',
      '<p>This is a one-pot dinner built for tired evenings: rice, tomatoes, warm spices, and whatever herbs survived the week.</p><h2>Cook by smell, not by stopwatch</h2><p>Toast the spices until the kitchen changes, then add the rice. The recipe is forgiving enough to become your own.</p>',
      'https://picsum.photos/seed/tomato-rice/1400/788',
      'food', '5 days', '["recipe", "home-cooking", "vegetarian"]', TRUE, 1325, 'kabir_kitchen'
    ),
    (
      'Why Quiet Films Stay With Us',
      '<p>Some films do not chase us out of the theatre with a conclusion. They leave a door open and trust us to carry the story home.</p><h2>Silence creates participation</h2><p>When a scene makes room for uncertainty, the viewer becomes an active collaborator rather than a passenger.</p>',
      'https://picsum.photos/seed/quiet-cinema/1400/788',
      'cinema', '6 days', '["film", "essays", "storytelling"]', TRUE, 1268, 'nora_frames'
    ),
    (
      'What I Learned Rebuilding My Personal Site',
      '<p>A small personal site is a useful laboratory. Every shortcut is visible, but every improvement is yours to understand.</p><h2>Start with the content model</h2><p>The redesign became easier after I stopped arranging boxes and wrote down what a reader should find first.</p><pre><code>content → structure → presentation</code></pre>',
      'https://picsum.photos/seed/personal-site/1400/788',
      'tech', '8 days', '["web-development", "frontend", "learning"]', FALSE, 1086, 'arjun_codes'
    ),
    (
      'Citizen Science Begins With Paying Attention',
      '<p>You do not need a laboratory to make a useful observation. A notebook, a repeatable method, and patience can reveal how a street changes through a season.</p><h2>Record what you can verify</h2><p>Dates, weather, location, and photographs turn a passing impression into something others can compare.</p>',
      'https://picsum.photos/seed/citizen-science/1400/788',
      'science', '10 days', '["nature", "citizen-science", "observation"]', FALSE, 987, 'ira_observes'
    ),
    (
      'Running Slowly Made Me More Consistent',
      '<p>I used to treat every run as a test. Predictably, I spent more time recovering than running.</p><h2>Easy effort is real training</h2><p>Slowing down created space for regular weeks, better sleep, and the occasional fast day that actually felt fast.</p>',
      'https://picsum.photos/seed/slow-running/1400/788',
      'sports', '12 days', '["running", "training", "recovery"]', FALSE, 912, 'dev_on_track'
    ),
    (
      'A Sketchbook Does Not Need to Be Beautiful',
      '<p>A sketchbook is a workspace, not an exhibition. The crossed-out lines and abandoned pages are evidence that it is doing its job.</p><h2>Make the page inexpensive</h2><p>Use materials that do not make you hesitate. The easier it is to begin badly, the more often a useful idea appears.</p>',
      'https://picsum.photos/seed/messy-sketchbook/1400/788',
      'art', '14 days', '["drawing", "practice", "creativity"]', FALSE, 865, 'sam_sketches'
    ),
    (
      'Packing Light for a Four-Day Train Journey',
      '<p>The best item in my bag was empty space. It made every platform change calmer and left room for food, books, and small things collected along the way.</p><h2>Pack around repeated use</h2><p>Choose layers that work together, one comfortable pair of shoes, and a bag you can lift without thinking.</p>',
      'https://picsum.photos/seed/train-packing/1400/788',
      'travel', '16 days', '["trains", "packing", "slow-travel"]', FALSE, 821, 'leena_roams'
    ),
    (
      'Bread for People Who Forget the Timer',
      '<p>This loaf has wide margins. It tolerates a cool kitchen, an extra hour of proofing, and the distraction of a long phone call.</p><h2>Watch the dough</h2><p>Recipes give times, but dough gives signals: volume, softness, bubbles, and the slow return of a fingertip.</p>',
      'https://picsum.photos/seed/forgiving-bread/1400/788',
      'food', '18 days', '["bread", "baking", "beginner"]', FALSE, 779, 'kabir_kitchen'
    ),
    (
      'Editing Rhythm: Cut on Attention, Not Only Motion',
      '<p>A cut feels natural when it arrives at the instant our attention moves. Motion is one cue, but a glance, a sound, or a new thought can be stronger.</p><h2>Listen before you look</h2><p>Audio often reveals the emotional edit before the picture does.</p>',
      'https://picsum.photos/seed/editing-rhythm/1400/788',
      'cinema', '20 days', '["editing", "film", "craft"]', FALSE, 742, 'nora_frames'
    ),
    (
      'Designing APIs for the Person Debugging at Midnight',
      '<p>An API is also a conversation with someone who is confused. Predictable status codes and safe, specific errors shorten that conversation.</p><h2>Consistency is a feature</h2><p>Use the same shapes, names, and pagination rules wherever the underlying idea is the same.</p>',
      'https://picsum.photos/seed/api-design/1400/788',
      'technology', '23 days', '["backend", "api", "engineering"]', FALSE, 706, 'arjun_codes'
    ),
    (
      'The Night Sky From an Apartment Balcony',
      '<p>Urban astronomy begins with modest expectations. The brightest planets, the Moon, and a few seasonal constellations are enough to build familiarity.</p><h2>Return to the same patch of sky</h2><p>Recognition grows through repetition. A small view observed often becomes a map.</p>',
      'https://picsum.photos/seed/balcony-sky/1400/788',
      'science', '25 days', '["astronomy", "city-life", "beginner"]', FALSE, 681, 'ira_observes'
    ),
    (
      'Five-a-Side Football and the Joy of Small Spaces',
      '<p>A smaller pitch removes hiding places. Everyone attacks, everyone defends, and a single good first touch can change the game.</p><h2>Constraints create invention</h2><p>Walls, quick restarts, and crowded passing lanes reward awareness more than spectacle.</p>',
      'https://picsum.photos/seed/five-a-side/1400/788',
      'sports', '27 days', '["football", "community", "fitness"]', FALSE, 645, 'dev_on_track'
    ),
    (
      'Public Murals Are Conversations With a Street',
      '<p>A mural changes as the wall changes. Weather softens it, posters interrupt it, and the neighborhood supplies meanings the artist could not plan.</p><h2>Look at the edges</h2><p>The most interesting part is often where the artwork meets a window, a shop sign, or a passerby.</p>',
      'https://picsum.photos/seed/public-murals/1400/788',
      'art', '30 days', '["public-art", "cities", "culture"]', FALSE, 602, 'sam_sketches'
    ),
    (
      'A Neighborhood Cafe Is More Than Its Coffee',
      '<p>The places we return to know our pace. They offer a familiar table, a brief conversation, and permission to stay between one task and the next.</p><h2>Hospitality is a rhythm</h2><p>Good service is attentive without turning every moment into a transaction.</p>',
      'https://picsum.photos/seed/neighborhood-cafe/1400/788',
      'food', '33 days', '["cafes", "community", "food-culture"]', FALSE, 574, 'kabir_kitchen'
    ),
    (
      'Train Windows and the Geography Between Destinations',
      '<p>Maps emphasize arrival. Train windows restore the long middle: fields, workshops, backyards, rivers, and stations too small for your timetable.</p><h2>Travel has connective tissue</h2><p>The in-between places make distance tangible and remind us that destinations are never isolated.</p>',
      'https://picsum.photos/seed/train-windows/1400/788',
      'travel', '36 days', '["railways", "photography", "essays"]', FALSE, 538, 'leena_roams'
    ),
    (
      'A Practical Personal Knowledge System',
      '<p>The useful note is not the one filed perfectly. It is the one you can rediscover when a new problem gives it context.</p><h2>Prefer links over elaborate folders</h2><p>Capture the source, summarize the idea in your own words, and connect it to something you already care about.</p>',
      'https://picsum.photos/seed/knowledge-system/1400/788',
      'scitech', '40 days', '["notes", "productivity", "learning"]', FALSE, 501, 'maya_writes'
    ),
    (
      'Photography as a Way of Returning',
      '<p>I photographed the same corner for six months. Repetition made tiny changes visible: a chair moved, a tree filled out, afternoon light climbed the wall.</p><h2>A series can be quieter than a single image</h2><p>Together, ordinary frames describe time better than one dramatic photograph.</p>',
      'https://picsum.photos/seed/returning-photo/1400/788',
      'art', '44 days', '["photography", "practice", "time"]', FALSE, 467, 'nora_frames'
    ),
    (
      'A Rainy-Day Watchlist Without the Usual Classics',
      '<p>This list favors intimate rooms, patient conversations, and stories that suit the softened light of a wet afternoon.</p><h2>Choose by mood, not importance</h2><p>A watchlist becomes more personal when it follows curiosity instead of consensus.</p>',
      'https://picsum.photos/seed/rainy-watchlist/1400/788',
      'cinema', '48 days', '["films", "watchlist", "recommendations"]', FALSE, 429, 'nora_frames'
    ),
    (
      'Strength Training for Runners Who Prefer Being Outside',
      '<p>Two short sessions a week can support the thing you actually love doing. The goal is durability, not turning the gym into a second sport.</p><h2>Keep the menu small</h2><p>Squat, hinge, push, pull, carry, and leave enough energy for tomorrow.</p>',
      'https://picsum.photos/seed/runner-strength/1400/788',
      'sports', '52 days', '["strength", "running", "injury-prevention"]', FALSE, 391, 'dev_on_track'
    ),
    (
      'Three Browser Performance Wins That Cost Almost Nothing',
      '<p>Before introducing a complex optimization layer, make images honest about their size, delay work below the fold, and remove code the page never uses.</p><h2>Measure the boring fixes</h2><p>Simple changes often produce the clearest improvements because they reduce work instead of reorganizing it.</p>',
      'https://picsum.photos/seed/browser-performance/1400/788',
      'tech', '57 days', '["performance", "javascript", "web-development"]', FALSE, 356, 'arjun_codes'
    ),
    (
      'Can a Garden Become a Weather Station?',
      '<p>Leaves, insects, soil, and flowering dates respond to conditions before a dashboard tells the story.</p><h2>Combine instruments with observation</h2><p>A thermometer gives precision; a weekly field note gives context. Together they make a useful local record.</p>',
      'https://picsum.photos/seed/garden-weather/1400/788',
      'scitech', '63 days', '["weather", "gardening", "data"]', FALSE, 318, 'ira_observes'
    )
) AS sample(title, description, image, category, published_ago, tags, featured, views, author_username)
JOIN users author ON author.username = sample.author_username;

-- Drafts are visible only to their owners.
INSERT INTO posts (
  title, "desc", img, cat, date, uid, draft, scheduled_publish_date, tags, featured, views
)
SELECT
  sample.title,
  sample.description,
  sample.image,
  sample.category,
  CURRENT_TIMESTAMP - sample.updated_ago::interval,
  author.id,
  TRUE,
  NULL,
  sample.tags::jsonb,
  FALSE,
  0
FROM (
  VALUES
    (
      'Notes Toward an Essay About Digital Patience',
      '<p>A rough opening about waiting, refreshing, and what software teaches us to expect.</p>',
      '', 'technology', '4 hours', '["draft", "attention"]', 'maya_writes'
    ),
    (
      'The Pantry Pasta Draft',
      '<p>Test quantities again. Add the lemon variation and a photograph of the final texture.</p>',
      '', 'food', '1 day', '["draft", "recipe"]', 'kabir_kitchen'
    ),
    (
      'Color Studies From the Bus Stop',
      '',
      '', 'art', '3 days', '["draft", "sketchbook"]', 'sam_sketches'
    )
) AS sample(title, description, image, category, updated_ago, tags, author_username)
JOIN users author ON author.username = sample.author_username;

-- Scheduled posts remain drafts until the scheduler publishes them.
INSERT INTO posts (
  title, "desc", img, cat, date, uid, draft, scheduled_publish_date, tags, featured, views
)
SELECT
  sample.title,
  sample.description,
  sample.image,
  sample.category,
  CURRENT_TIMESTAMP,
  author.id,
  TRUE,
  CURRENT_TIMESTAMP + sample.publish_in::interval,
  sample.tags::jsonb,
  FALSE,
  0
FROM (
  VALUES
    (
      'How I Plan a Weekend Without Overplanning It',
      '<p>A flexible weekend needs one anchor, one optional idea, and enough empty time for the place to surprise you.</p>',
      'https://picsum.photos/seed/weekend-plan/1400/788',
      'travel', '2 days', '["weekend", "planning", "slow-travel"]', 'leena_roams'
    ),
    (
      'The Case for Smaller Side Projects',
      '<p>A project can be meaningful without becoming a platform. A narrow finish line creates room to learn, share, and move on.</p>',
      'https://picsum.photos/seed/small-projects/1400/788',
      'tech', '5 days', '["side-projects", "learning", "software"]', 'arjun_codes'
    ),
    (
      'Soup for the First Cool Evening',
      '<p>Roasted squash, ginger, and coconut milk make a simple soup that tastes as if the season changed on purpose.</p>',
      'https://picsum.photos/seed/cool-evening-soup/1400/788',
      'food', '8 days', '["soup", "seasonal", "recipe"]', 'kabir_kitchen'
    )
) AS sample(title, description, image, category, publish_in, tags, author_username)
JOIN users author ON author.username = sample.author_username;

INSERT INTO comments (comment, cpostid, cuserid, created_at)
SELECT
  sample.comment,
  post.id,
  commenter.id,
  CURRENT_TIMESTAMP - sample.commented_ago::interval
FROM (
  VALUES
    ('This is exactly the kind of detail I usually feel but cannot name.', 'maya_writes', 'The Small Interfaces That Make a Product Feel Thoughtful', '18 hours'),
    ('The line about removing uncertainty is going into my project notes.', 'sam_sketches', 'The Small Interfaces That Make a Product Feel Thoughtful', '14 hours'),
    ('I tried this today and made it almost twenty minutes before checking my phone.', 'arjun_codes', 'A Quiet Morning Practice for Noisy Weeks', '1 day'),
    ('A routine that can bend is such a helpful way to frame it.', 'ira_observes', 'A Quiet Morning Practice for Noisy Weeks', '20 hours'),
    ('Fort Kochi rewards exactly this kind of wandering.', 'kabir_kitchen', 'Fort Kochi on Foot: A Day Without an Itinerary', '2 days'),
    ('Saving this for my next trip south.', 'dev_on_track', 'Fort Kochi on Foot: A Day Without an Itinerary', '1 day'),
    ('Made it with leftover rice and it still worked beautifully.', 'maya_writes', 'The Weeknight Tomato Rice I Keep Returning To', '2 days'),
    ('The toasted spice cue is more useful than a strict time.', 'ira_observes', 'The Weeknight Tomato Rice I Keep Returning To', '1 day'),
    ('Quiet films give you somewhere to put your own memories.', 'leena_roams', 'Why Quiet Films Stay With Us', '3 days'),
    ('Content model before boxes would have saved my last redesign.', 'nora_frames', 'What I Learned Rebuilding My Personal Site', '5 days'),
    ('This would make a wonderful neighborhood group project.', 'sam_sketches', 'Citizen Science Begins With Paying Attention', '6 days'),
    ('Slow running finally made four days a week possible for me.', 'kabir_kitchen', 'Running Slowly Made Me More Consistent', '7 days'),
    ('Needed this permission to ruin a few pages.', 'maya_writes', 'A Sketchbook Does Not Need to Be Beautiful', '8 days'),
    ('Empty space is the most underrated thing to pack.', 'nora_frames', 'Packing Light for a Four-Day Train Journey', '10 days'),
    ('Watching the dough instead of the clock changed my bread completely.', 'dev_on_track', 'Bread for People Who Forget the Timer', '11 days'),
    ('Audio has rescued more edits than I can count.', 'arjun_codes', 'Editing Rhythm: Cut on Attention, Not Only Motion', '12 days'),
    ('Predictable errors are kindness for future maintainers.', 'maya_writes', 'Designing APIs for the Person Debugging at Midnight', '14 days'),
    ('I started with the Moon and now I can recognize Jupiter.', 'leena_roams', 'The Night Sky From an Apartment Balcony', '15 days'),
    ('Small-sided games are exhausting in the best way.', 'arjun_codes', 'Five-a-Side Football and the Joy of Small Spaces', '17 days'),
    ('The edges really are where the neighborhood enters the image.', 'nora_frames', 'Public Murals Are Conversations With a Street', '18 days'),
    ('This captures why I keep returning to the same two places.', 'sam_sketches', 'A Neighborhood Cafe Is More Than Its Coffee', '20 days'),
    ('I always photograph the tiny stations too.', 'ira_observes', 'Train Windows and the Geography Between Destinations', '22 days'),
    ('Links over folders is the first note-taking advice that stuck for me.', 'arjun_codes', 'A Practical Personal Knowledge System', '25 days'),
    ('A repeated frame becomes a kind of diary.', 'leena_roams', 'Photography as a Way of Returning', '28 days')
) AS sample(comment, commenter_username, post_title, commented_ago)
JOIN users commenter ON commenter.username = sample.commenter_username
JOIN posts post ON post.title = sample.post_title;

INSERT INTO follows (follower_id, following_id, created_at)
SELECT
  follower.id,
  followed.id,
  CURRENT_TIMESTAMP - sample.followed_ago::interval
FROM (
  VALUES
    ('maya_writes', 'arjun_codes', '90 days'),
    ('maya_writes', 'leena_roams', '70 days'),
    ('maya_writes', 'nora_frames', '42 days'),
    ('arjun_codes', 'maya_writes', '88 days'),
    ('arjun_codes', 'ira_observes', '39 days'),
    ('leena_roams', 'maya_writes', '62 days'),
    ('leena_roams', 'kabir_kitchen', '55 days'),
    ('kabir_kitchen', 'leena_roams', '52 days'),
    ('kabir_kitchen', 'dev_on_track', '31 days'),
    ('nora_frames', 'sam_sketches', '46 days'),
    ('nora_frames', 'maya_writes', '28 days'),
    ('dev_on_track', 'kabir_kitchen', '26 days'),
    ('dev_on_track', 'ira_observes', '21 days'),
    ('ira_observes', 'arjun_codes', '19 days'),
    ('ira_observes', 'sam_sketches', '16 days'),
    ('sam_sketches', 'nora_frames', '44 days'),
    ('sam_sketches', 'maya_writes', '12 days')
) AS sample(follower_username, followed_username, followed_ago)
JOIN users follower ON follower.username = sample.follower_username
JOIN users followed ON followed.username = sample.followed_username;

INSERT INTO bookmarks (uid, pid, created_at)
SELECT
  reader.id,
  post.id,
  CURRENT_TIMESTAMP - sample.saved_ago::interval
FROM (
  VALUES
    ('maya_writes', 'The Small Interfaces That Make a Product Feel Thoughtful', '1 day'),
    ('maya_writes', 'Fort Kochi on Foot: A Day Without an Itinerary', '2 days'),
    ('maya_writes', 'Bread for People Who Forget the Timer', '7 days'),
    ('arjun_codes', 'A Quiet Morning Practice for Noisy Weeks', '2 days'),
    ('arjun_codes', 'Designing APIs for the Person Debugging at Midnight', '9 days'),
    ('arjun_codes', 'A Practical Personal Knowledge System', '12 days'),
    ('leena_roams', 'Why Quiet Films Stay With Us', '3 days'),
    ('leena_roams', 'Photography as a Way of Returning', '10 days'),
    ('kabir_kitchen', 'Running Slowly Made Me More Consistent', '4 days'),
    ('kabir_kitchen', 'A Neighborhood Cafe Is More Than Its Coffee', '6 days'),
    ('nora_frames', 'Public Murals Are Conversations With a Street', '5 days'),
    ('nora_frames', 'Train Windows and the Geography Between Destinations', '11 days'),
    ('dev_on_track', 'The Weeknight Tomato Rice I Keep Returning To', '4 days'),
    ('dev_on_track', 'Strength Training for Runners Who Prefer Being Outside', '8 days'),
    ('ira_observes', 'Citizen Science Begins With Paying Attention', '3 days'),
    ('ira_observes', 'The Night Sky From an Apartment Balcony', '9 days'),
    ('sam_sketches', 'A Sketchbook Does Not Need to Be Beautiful', '5 days'),
    ('sam_sketches', 'The Small Interfaces That Make a Product Feel Thoughtful', '6 days')
) AS sample(reader_username, post_title, saved_ago)
JOIN users reader ON reader.username = sample.reader_username
JOIN posts post ON post.title = sample.post_title;

INSERT INTO reactions (user_id, post_id, comment_id, reaction_type, created_at)
SELECT
  reactor.id,
  post.id,
  NULL,
  sample.reaction_type,
  CURRENT_TIMESTAMP - sample.reacted_ago::interval
FROM (
  VALUES
    ('maya_writes', 'The Small Interfaces That Make a Product Feel Thoughtful', 'love', '1 day'),
    ('leena_roams', 'The Small Interfaces That Make a Product Feel Thoughtful', 'like', '1 day'),
    ('sam_sketches', 'The Small Interfaces That Make a Product Feel Thoughtful', 'celebrate', '14 hours'),
    ('arjun_codes', 'A Quiet Morning Practice for Noisy Weeks', 'love', '2 days'),
    ('ira_observes', 'A Quiet Morning Practice for Noisy Weeks', 'like', '1 day'),
    ('kabir_kitchen', 'Fort Kochi on Foot: A Day Without an Itinerary', 'love', '2 days'),
    ('dev_on_track', 'Fort Kochi on Foot: A Day Without an Itinerary', 'like', '1 day'),
    ('maya_writes', 'The Weeknight Tomato Rice I Keep Returning To', 'celebrate', '2 days'),
    ('ira_observes', 'The Weeknight Tomato Rice I Keep Returning To', 'love', '1 day'),
    ('leena_roams', 'Why Quiet Films Stay With Us', 'love', '3 days'),
    ('nora_frames', 'What I Learned Rebuilding My Personal Site', 'like', '5 days'),
    ('sam_sketches', 'Citizen Science Begins With Paying Attention', 'celebrate', '6 days'),
    ('kabir_kitchen', 'Running Slowly Made Me More Consistent', 'like', '7 days'),
    ('maya_writes', 'A Sketchbook Does Not Need to Be Beautiful', 'love', '8 days'),
    ('nora_frames', 'Packing Light for a Four-Day Train Journey', 'like', '10 days'),
    ('dev_on_track', 'Bread for People Who Forget the Timer', 'celebrate', '11 days'),
    ('arjun_codes', 'Editing Rhythm: Cut on Attention, Not Only Motion', 'love', '12 days'),
    ('maya_writes', 'Designing APIs for the Person Debugging at Midnight', 'celebrate', '14 days'),
    ('leena_roams', 'The Night Sky From an Apartment Balcony', 'like', '15 days'),
    ('arjun_codes', 'Five-a-Side Football and the Joy of Small Spaces', 'love', '17 days'),
    ('nora_frames', 'Public Murals Are Conversations With a Street', 'celebrate', '18 days'),
    ('sam_sketches', 'A Neighborhood Cafe Is More Than Its Coffee', 'love', '20 days'),
    ('ira_observes', 'Train Windows and the Geography Between Destinations', 'like', '22 days'),
    ('arjun_codes', 'A Practical Personal Knowledge System', 'celebrate', '25 days'),
    ('leena_roams', 'Photography as a Way of Returning', 'love', '28 days')
) AS sample(reactor_username, post_title, reaction_type, reacted_ago)
JOIN users reactor ON reactor.username = sample.reactor_username
JOIN posts post ON post.title = sample.post_title;

-- Build a realistic chronological activity feed from the seeded actions.
INSERT INTO activities (
  user_id, activity_type, post_id, target_user_id, comment_id, created_at
)
SELECT uid, 'post', id, NULL, NULL, date
FROM posts
WHERE draft = FALSE;

INSERT INTO activities (
  user_id, activity_type, post_id, target_user_id, comment_id, created_at
)
SELECT comment.cuserid, 'comment', comment.cpostid, post.uid, comment.id, comment.created_at
FROM comments comment
JOIN posts post ON post.id = comment.cpostid;

INSERT INTO activities (
  user_id, activity_type, post_id, target_user_id, comment_id, created_at
)
SELECT reaction.user_id, 'reaction', reaction.post_id, post.uid, NULL, reaction.created_at
FROM reactions reaction
JOIN posts post ON post.id = reaction.post_id
WHERE reaction.user_id <> post.uid;

INSERT INTO activities (
  user_id, activity_type, post_id, target_user_id, comment_id, created_at
)
SELECT follower_id, 'follow', NULL, following_id, NULL, created_at
FROM follows;

INSERT INTO subscribers (email, created_at)
VALUES
  ('reader.one@example.com', CURRENT_TIMESTAMP - INTERVAL '40 days'),
  ('reader.two@example.com', CURRENT_TIMESTAMP - INTERVAL '18 days'),
  ('reader.three@example.com', CURRENT_TIMESTAMP - INTERVAL '5 days');

COMMIT;

-- A compact verification summary returned by psql after the seed succeeds.
SELECT 'users' AS entity, COUNT(*) AS total FROM users
UNION ALL SELECT 'published posts', COUNT(*) FROM posts WHERE draft = FALSE
UNION ALL SELECT 'drafts', COUNT(*) FROM posts WHERE draft = TRUE AND scheduled_publish_date IS NULL
UNION ALL SELECT 'scheduled posts', COUNT(*) FROM posts WHERE draft = TRUE AND scheduled_publish_date IS NOT NULL
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'bookmarks', COUNT(*) FROM bookmarks
UNION ALL SELECT 'reactions', COUNT(*) FROM reactions
UNION ALL SELECT 'follows', COUNT(*) FROM follows
UNION ALL SELECT 'activities', COUNT(*) FROM activities
UNION ALL SELECT 'subscribers', COUNT(*) FROM subscribers
ORDER BY entity;
