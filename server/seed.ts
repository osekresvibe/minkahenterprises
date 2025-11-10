import { storage } from "./storage";
import crypto from "crypto";

// Helper to create realistic test data
const churchNames = [
  "Grace Community Church",
  "Hope Fellowship",
  "New Life Assembly",
  "River of Life Church",
  "Victory Christian Center"
];

const churchDescriptions = [
  "A vibrant community focused on grace, love, and service to our neighborhood.",
  "Building hope and faith together through worship, fellowship, and outreach.",
  "Experiencing new life in Christ through dynamic worship and biblical teaching.",
  "Flowing with the Spirit, making disciples, and transforming lives.",
  "Empowering believers to live victoriously in Christ through faith and action."
];

const firstNames = ["John", "Sarah", "Michael", "Emily", "David", "Jessica", "Daniel", "Rachel", "Matthew", "Hannah"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

const ministryTeamNames = [
  ["Worship Team", "Youth Ministry", "Prayer Team", "Outreach Committee"],
  ["Music Ministry", "Children's Church", "Hospitality", "Media Team"],
  ["Praise Team", "Teen Ministry", "Intercession", "Community Service"],
  ["Choir", "Kids Ministry", "Prayer Warriors", "Missions"],
  ["Band", "Youth Group", "Prayer Circle", "Evangelism"]
];

const eventTitles = [
  "Sunday Worship Service",
  "Wednesday Bible Study",
  "Youth Night",
  "Community Outreach",
  "Prayer Meeting",
  "Women's Conference",
  "Men's Breakfast",
  "Family Fun Day"
];

async function seedDatabase() {
  console.log("🌱 Starting database seed...");

  const churches = [];
  const allUsers = [];

  // Create 5 churches with complete data
  for (let i = 0; i < 5; i++) {
    console.log(`\n📍 Creating church ${i + 1}: ${churchNames[i]}`);

    // Create admin user for this church
    const adminEmail = `admin${i + 1}@church${i + 1}.com`;
    const adminUser = await storage.upsertUser({
      id: `admin-${i + 1}`,
      email: adminEmail,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      role: "member", // Will be upgraded to church_admin after church approval
    });
    allUsers.push(adminUser);

    // Create church
    const church = await storage.createChurch({
      name: churchNames[i],
      description: churchDescriptions[i],
      address: `${100 + i * 100} Main Street, City ${i + 1}, State ${10000 + i}`,
      phone: `(555) ${100 + i}-${1000 + i}`,
      email: `contact@church${i + 1}.com`,
      website: `https://www.church${i + 1}.org`,
      adminUserId: adminUser.id,
      status: "pending",
    });
    churches.push(church);

    // Auto-approve church and set admin role
    await storage.updateChurchStatus(church.id, "approved");
    await storage.updateUserRole(adminUser.id, "church_admin", church.id);

    console.log(`  ✓ Church created and approved`);
    console.log(`  ✓ Admin: ${adminEmail}`);

    // Create 8-12 members per church
    const memberCount = 8 + Math.floor(Math.random() * 5);
    const churchMembers = [];

    for (let j = 0; j < memberCount; j++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const member = await storage.upsertUser({
        id: `user-${i}-${j}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}${j}@email.com`,
        firstName,
        lastName,
        role: "member",
      });
      await storage.updateUserRole(member.id, "member", church.id);
      churchMembers.push(member);
      allUsers.push(member);
    }

    console.log(`  ✓ Created ${memberCount} members`);

    // Create 4 ministry teams
    const teams = [];
    for (let t = 0; t < 4; t++) {
      const team = await storage.createMinistryTeam({
        churchId: church.id,
        name: ministryTeamNames[i][t],
        description: `Serving God through ${ministryTeamNames[i][t].toLowerCase()}`,
      });
      teams.push(team);

      // Add 3-5 members to each team
      const teamMemberCount = 3 + Math.floor(Math.random() * 3);
      for (let tm = 0; tm < teamMemberCount && tm < churchMembers.length; tm++) {
        const roles = ["leader", "co_leader", "member", "volunteer"];
        await storage.addTeamMember({
          teamId: team.id,
          userId: churchMembers[tm].id,
          role: tm === 0 ? "leader" : roles[Math.floor(Math.random() * roles.length)],
        });
      }
    }

    console.log(`  ✓ Created 4 ministry teams with members`);

    // Create 5-8 events
    const eventCount = 5 + Math.floor(Math.random() * 4);
    for (let e = 0; e < eventCount; e++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
      startDate.setHours(10 + Math.floor(Math.random() * 10), 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 2);

      const event = await storage.createEvent({
        churchId: church.id,
        creatorId: adminUser.id,
        title: eventTitles[e % eventTitles.length],
        description: `Join us for ${eventTitles[e % eventTitles.length].toLowerCase()}!`,
        location: `${church.name} Main Hall`,
        startTime: startDate,
        endTime: endDate,
        maxAttendees: 50 + Math.floor(Math.random() * 100),
      });

      // Add RSVPs from members
      const rsvpCount = Math.min(5, churchMembers.length);
      for (let r = 0; r < rsvpCount; r++) {
        const statuses = ["going", "maybe", "not_going"];
        await storage.upsertRsvp({
          eventId: event.id,
          userId: churchMembers[r].id,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        });
      }
    }

    console.log(`  ✓ Created ${eventCount} events with RSVPs`);

    // Create 3-5 posts
    const postCount = 3 + Math.floor(Math.random() * 3);
    const postTitles = [
      "Welcome to Our Church Family!",
      "Upcoming Events This Month",
      "Prayer Request Updates",
      "Community Service Opportunity",
      "New Ministry Launch"
    ];

    for (let p = 0; p < postCount; p++) {
      await storage.createPost({
        churchId: church.id,
        authorId: adminUser.id,
        title: postTitles[p % postTitles.length],
        content: `This is an important announcement about ${postTitles[p % postTitles.length].toLowerCase()}. We hope everyone can participate!`,
        isPinned: p === 0,
      });
    }

    console.log(`  ✓ Created ${postCount} posts`);

    // Create message channels
    const channels = await storage.getChannels(church.id);
    if (channels.length > 0) {
      // Add messages to general channel
      const generalChannel = channels.find(c => c.name === "general") || channels[0];

      const messages = [
        "Welcome everyone to our church chat!",
        "Looking forward to this Sunday's service!",
        "Does anyone need a ride to Wednesday's Bible study?",
        "Thank you all for the prayers last week!",
        "Reminder: Youth night this Friday at 7 PM"
      ];

      for (let m = 0; m < messages.length; m++) {
        const sender = m === 0 ? adminUser : churchMembers[m % churchMembers.length];
        await storage.createMessage({
          channelId: generalChannel.id,
          userId: sender.id,
          content: messages[m],
        });
      }

      console.log(`  ✓ Created ${messages.length} messages`);
    }

    // Create check-ins
    const checkInCount = Math.min(10, churchMembers.length);
    for (let c = 0; c < checkInCount; c++) {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() - Math.floor(Math.random() * 7));

      await storage.createCheckIn({
        churchId: church.id,
        userId: churchMembers[c % churchMembers.length].id,
        checkInTime: checkInDate,
        notes: c % 3 === 0 ? "First time visitor!" : undefined,
      });
    }

    console.log(`  ✓ Created ${checkInCount} check-ins`);
  }

  console.log("\n✅ Database seeding completed!");
  console.log(`\n📊 Summary:`);
  console.log(`   - Churches: ${churches.length}`);
  console.log(`   - Total users: ${allUsers.length}`);
  console.log(`   - Each church has:`);
  console.log(`     • 1 admin + 8-12 members`);
  console.log(`     • 4 ministry teams`);
  console.log(`     • 5-8 events with RSVPs`);
  console.log(`     • 3-5 posts`);
  console.log(`     • Messages in channels`);
  console.log(`     • Check-in records`);

  console.log(`\n🔑 Test Login Credentials:`);
  for (let i = 0; i < churches.length; i++) {
    console.log(`   Church ${i + 1} Admin: admin${i + 1}@church${i + 1}.com`);
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log("\n🎉 Seeding complete! You can now test all features.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });