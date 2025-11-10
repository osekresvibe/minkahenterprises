import { db } from "../server/db";
import { 
  churches, 
  users, 
  events, 
  eventRsvps,
  ministryTeams, 
  teamMembers,
  messageChannels,
  messages,
  checkIns,
  posts
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function populateSampleData() {
  console.log("🌱 Starting to populate sample data...");

  try {
    // Get the first approved church
    const existingChurches = await db.select().from(churches).where(eq(churches.status, 'approved')).limit(1);
    
    if (existingChurches.length === 0) {
      console.log("❌ No approved churches found. Please login and register/approve a church first.");
      return;
    }

    const church = existingChurches[0];
    console.log(`✅ Found church: ${church.name}`);

    // Get the church admin
    const admins = await db.select().from(users).where(and(eq(users.churchId, church.id), eq(users.role, 'church_admin'))).limit(1);
    
    if (admins.length === 0) {
      console.log("❌ No church admin found.");
      return;
    }

    const admin = admins[0];
    console.log(`✅ Found admin: ${admin.email}`);

    // Create sample members
    console.log("\n👥 Creating sample members...");
    const memberEmails = [
      { firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@example.com" },
      { firstName: "Michael", lastName: "Chen", email: "michael.chen@example.com" },
      { firstName: "Emily", lastName: "Rodriguez", email: "emily.rodriguez@example.com" },
      { firstName: "David", lastName: "Thompson", email: "david.thompson@example.com" },
      { firstName: "Jessica", lastName: "Williams", email: "jessica.williams@example.com" },
      { firstName: "Robert", lastName: "Brown", email: "robert.brown@example.com" },
      { firstName: "Jennifer", lastName: "Davis", email: "jennifer.davis@example.com" },
      { firstName: "Christopher", lastName: "Garcia", email: "christopher.garcia@example.com" },
    ];

    const createdMembers = [];
    for (const member of memberEmails) {
      const existing = await db.select().from(users).where(eq(users.email, member.email)).limit(1);
      
      if (existing.length === 0) {
        const [newMember] = await db.insert(users).values({
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          role: "member",
          churchId: church.id,
          profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.firstName}`,
        }).returning();
        createdMembers.push(newMember);
        console.log(`  ✓ Created member: ${member.firstName} ${member.lastName}`);
      } else {
        createdMembers.push(existing[0]);
        console.log(`  → Member already exists: ${member.firstName} ${member.lastName}`);
      }
    }

    // Create ministry teams
    console.log("\n⛪ Creating ministry teams...");
    const teamData = [
      { 
        name: "Worship Team", 
        description: "Leading our congregation in worship through music and song every Sunday morning.",
        leaderIndex: 0 
      },
      { 
        name: "Youth Ministry", 
        description: "Engaging and mentoring the next generation through activities, Bible studies, and outreach.",
        leaderIndex: 1 
      },
      { 
        name: "Outreach & Missions", 
        description: "Serving our local community and supporting global missions to spread God's love.",
        leaderIndex: 2 
      },
      { 
        name: "Children's Ministry", 
        description: "Creating a safe, fun environment where children can learn about Jesus and grow in faith.",
        leaderIndex: 3 
      },
    ];

    const createdTeams = [];
    for (const team of teamData) {
      const existing = await db.select().from(ministryTeams).where(and(eq(ministryTeams.name, team.name), eq(ministryTeams.churchId, church.id))).limit(1);
      
      if (existing.length === 0) {
        const [newTeam] = await db.insert(ministryTeams).values({
          churchId: church.id,
          name: team.name,
          description: team.description,
        }).returning();
        createdTeams.push({ team: newTeam, leaderIndex: team.leaderIndex });
        console.log(`  ✓ Created team: ${team.name}`);

        // Assign leader and members to team
        const leader = createdMembers[team.leaderIndex];
        await db.insert(teamMembers).values({
          teamId: newTeam.id,
          userId: leader.id,
          role: "leader",
        });
        console.log(`    → Assigned ${leader.firstName} ${leader.lastName} as leader`);

        // Add 2-3 other members to each team
        const membersToAdd = createdMembers.slice(team.leaderIndex + 1, team.leaderIndex + 4);
        for (let i = 0; i < membersToAdd.length; i++) {
          const member = membersToAdd[i];
          await db.insert(teamMembers).values({
            teamId: newTeam.id,
            userId: member.id,
            role: i === 0 ? "co_leader" : "member",
          });
          console.log(`    → Added ${member.firstName} as ${i === 0 ? "co-leader" : "member"}`);
        }
      } else {
        console.log(`  → Team already exists: ${team.name}`);
      }
    }

    // Create events
    console.log("\n📅 Creating events...");
    const now = new Date();
    const eventsData = [
      {
        title: "Sunday Worship Service",
        description: "Join us for our weekly worship service featuring inspiring music, powerful preaching, and meaningful fellowship.",
        location: "Main Sanctuary",
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 min duration
      },
      {
        title: "Wednesday Bible Study",
        description: "Deep dive into Scripture together. This week we're exploring the Book of James and its practical wisdom for daily living.",
        location: "Fellowship Hall",
        startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
      {
        title: "Community Outreach Day",
        description: "Serve our local community! We'll be volunteering at the food bank and visiting nursing homes. Bring your serving hearts!",
        location: "Community Center",
        startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      },
      {
        title: "Youth Group Game Night",
        description: "Teens, join us for an evening of fun games, pizza, and great conversations about faith and life!",
        location: "Youth Room",
        startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      },
      {
        title: "Easter Celebration Service",
        description: "Celebrate the resurrection of Jesus Christ with us! Special worship, drama presentation, and communion.",
        location: "Main Sanctuary",
        startTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      },
    ];

    for (const event of eventsData) {
      const existing = await db.select().from(events).where(and(eq(events.title, event.title), eq(events.churchId, church.id))).limit(1);
      
      if (existing.length === 0) {
        const [newEvent] = await db.insert(events).values({
          ...event,
          churchId: church.id,
          creatorId: admin.id,
        }).returning();
        console.log(`  ✓ Created event: ${event.title}`);

        // Add some RSVPs
        const numRsvps = Math.floor(Math.random() * 4) + 2; // 2-5 RSVPs
        for (let i = 0; i < Math.min(numRsvps, createdMembers.length); i++) {
          const statuses = ["going", "maybe", "not_going"];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await db.insert(eventRsvps).values({
            eventId: newEvent.id,
            userId: createdMembers[i].id,
            status: status as any,
          });
        }
        console.log(`    → Added ${numRsvps} RSVPs`);
      } else {
        console.log(`  → Event already exists: ${event.title}`);
      }
    }

    // Create message channels
    console.log("\n💬 Creating message channels...");
    const channelData = [
      { name: "general", description: "General announcements and community updates" },
      { name: "prayer-requests", description: "Share prayer requests and praise reports" },
      { name: "events", description: "Discussion about upcoming events and activities" },
      { name: "volunteers", description: "Coordination for volunteer opportunities" },
    ];

    const createdChannels = [];
    for (const channel of channelData) {
      const existing = await db.select().from(messageChannels).where(and(eq(messageChannels.name, channel.name), eq(messageChannels.churchId, church.id))).limit(1);
      
      if (existing.length === 0) {
        const [newChannel] = await db.insert(messageChannels).values({
          churchId: church.id,
          name: channel.name,
          description: channel.description,
          createdBy: admin.id,
        }).returning();
        createdChannels.push(newChannel);
        console.log(`  ✓ Created channel: #${channel.name}`);
      } else {
        createdChannels.push(existing[0]);
        console.log(`  → Channel already exists: #${channel.name}`);
      }
    }

    // Create messages in channels
    console.log("\n💬 Creating messages...");
    const messagesData = [
      { channel: 0, userId: 0, content: "Welcome to our church community platform! We're excited to connect with you all here." },
      { channel: 0, userId: 1, content: "This is awesome! Love being able to stay connected throughout the week." },
      { channel: 1, userId: 2, content: "Please pray for my family as we navigate a difficult time. Your support means everything." },
      { channel: 1, userId: 3, content: "Praying for you and your family! God is faithful." },
      { channel: 2, userId: 0, content: "Don't forget to RSVP for Sunday's worship service! It's going to be a special day." },
      { channel: 3, userId: 4, content: "We need volunteers for the community outreach day. Sign up if you can help!" },
    ];

    for (const msg of messagesData) {
      if (createdChannels[msg.channel] && createdMembers[msg.userId]) {
        await db.insert(messages).values({
          channelId: createdChannels[msg.channel].id,
          userId: createdMembers[msg.userId].id,
          content: msg.content,
        });
      }
    }
    console.log(`  ✓ Created ${messagesData.length} messages`);

    // Create check-ins
    console.log("\n✅ Creating check-ins...");
    for (let i = 0; i < 5; i++) {
      const member = createdMembers[i];
      const checkInTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last week
      
      await db.insert(checkIns).values({
        userId: member.id,
        churchId: church.id,
        checkInTime,
        notes: i % 2 === 0 ? "Great service today!" : undefined,
      });
    }
    console.log(`  ✓ Created 5 check-ins`);

    // Create posts
    console.log("\n📝 Creating posts...");
    const postsData = [
      {
        title: "Welcome to Our Church Family!",
        content: "We are thrilled to have you join our community. Here you'll find updates, events, and ways to connect with fellow members. Don't hesitate to reach out if you need anything!",
      },
      {
        title: "This Week's Sermon Series",
        content: "Join us as we explore 'Living with Purpose' - a 4-week series on discovering God's calling for your life. Each Sunday we'll dive deeper into how faith shapes our daily decisions.",
      },
      {
        title: "Volunteer Opportunities",
        content: "Looking to serve? We have several teams that would love your help: Children's Ministry, Hospitality Team, Tech Team, and Community Outreach. Contact the church office to get involved!",
      },
    ];

    for (const post of postsData) {
      const existing = await db.select().from(posts).where(and(eq(posts.title, post.title), eq(posts.churchId, church.id))).limit(1);
      
      if (existing.length === 0) {
        await db.insert(posts).values({
          ...post,
          churchId: church.id,
          authorId: admin.id,
        });
        console.log(`  ✓ Created post: ${post.title}`);
      } else {
        console.log(`  → Post already exists: ${post.title}`);
      }
    }

    console.log("\n✨ Sample data population completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  • Church: ${church.name}`);
    console.log(`  • Members: ${createdMembers.length}`);
    console.log(`  • Ministry Teams: 4`);
    console.log(`  • Events: 5`);
    console.log(`  • Message Channels: 4`);
    console.log(`  • Messages: ${messagesData.length}`);
    console.log(`  • Check-ins: 5`);
    console.log(`  • Posts: 3`);
    console.log("\n🎉 Your church community platform is now populated with sample data!");
    
  } catch (error) {
    console.error("❌ Error populating sample data:", error);
    throw error;
  }
}

populateSampleData()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
