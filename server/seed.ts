
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

const firstNames = ["John", "Sarah", "Michael", "Emily", "David", "Jessica", "Daniel", "Rachel", "Matthew", "Hannah", "Joshua", "Elizabeth", "Christopher", "Mary", "Andrew", "Jennifer", "Joseph", "Linda", "James", "Patricia"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White"];

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
  "Family Fun Day",
  "Worship Night",
  "Leadership Training",
  "Mission Trip Planning",
  "Food Drive"
];

const postTitles = [
  "Welcome to Our Church Family!",
  "Upcoming Events This Month",
  "Prayer Request Updates",
  "Community Service Opportunity",
  "New Ministry Launch",
  "Baptism Celebration This Sunday",
  "Join Us for Worship Night",
  "Volunteer Opportunities Available",
  "Youth Group News",
  "Mission Trip Success Story"
];

const postContents = [
  "We are so blessed to have you as part of our community! Whether you're new or have been with us for years, you are family here. Come join us this Sunday!",
  "We have exciting events coming up! Check out our calendar and mark your dates. Bring your friends and family - all are welcome!",
  "Thank you for your continued prayers. We've seen amazing breakthroughs this week. Keep lifting up our community in prayer!",
  "We're organizing a food drive to help local families in need. Drop off non-perishable items at the church office Monday-Friday.",
  "Excited to announce our new children's ministry program starting next month! Registration is now open.",
  "Join us as we celebrate baptisms this Sunday! What a powerful testimony of faith and new beginnings.",
  "Don't miss our special worship night this Friday at 7 PM. Come ready to worship and encounter God's presence!",
  "Looking for volunteers to help with our community outreach programs. Sign up at the welcome desk!",
  "Youth group is going strong! Last week we had an amazing discussion about faith and purpose. Join us next week!",
  "Our recent mission trip was incredible! We served over 500 families and saw lives transformed. Thank you for your support!"
];

const occupations = [
  "Teacher", "Engineer", "Nurse", "Sales Manager", "Software Developer",
  "Accountant", "Marketing Specialist", "Healthcare Worker", "Business Owner",
  "Social Worker", "Designer", "Project Manager", "Consultant", "Therapist"
];

const hobbies = [
  "Reading, hiking, photography",
  "Cooking, gardening, music",
  "Sports, traveling, volunteering",
  "Arts and crafts, painting, writing",
  "Fitness, yoga, meditation",
  "Playing guitar, singing, composing",
  "Running, cycling, swimming",
  "Board games, puzzles, chess"
];

const servingAreas = [
  "Worship team, greeting ministry",
  "Children's ministry, teaching",
  "Youth ministry, mentoring",
  "Prayer team, hospitality",
  "Media team, tech support",
  "Outreach, community service",
  "Music ministry, choir",
  "Administrative support"
];

const bios = [
  "Passionate about serving God and making a difference in the community. Love connecting with people and sharing the love of Christ.",
  "Blessed to be part of this amazing church family. Excited about growing in faith and serving alongside brothers and sisters.",
  "Following Jesus and learning to live out His love every day. Grateful for this community and the journey we're on together.",
  "Dedicated to worship and prayer. Finding joy in serving God and seeing lives transformed by His grace.",
  "Committed to discipleship and helping others grow in their faith. Love being part of God's work in our community."
];

async function seedDatabase() {
  console.log("🌱 Starting comprehensive database seed...");

  const churches = [];
  const allUsers = [];

  // Create 5 churches with complete data
  for (let i = 0; i < 5; i++) {
    console.log(`\n📍 Creating church ${i + 1}: ${churchNames[i]}`);

    // Create admin user for this church with full profile
    const adminEmail = `admin${i + 1}@church${i + 1}.com`;
    const adminUser = await storage.upsertUser({
      id: `admin-${i + 1}`,
      email: adminEmail,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      role: "member",
    });
    
    // Update admin profile with detailed info
    await storage.updateUserProfile(adminUser.id, {
      phone: `(555) ${100 + i * 11}-${1000 + i * 111}`,
      address: `${100 + i * 50} Church Lane, City ${i + 1}, State ${10000 + i}`,
      bio: "Church administrator passionate about building community and serving God's people. Leading with love and dedication.",
      occupation: "Church Administrator",
      education: "Master of Divinity",
      maritalStatus: "Married",
      hobbies: "Reading theology, mentoring, community service",
      servingAreas: "Leadership, administration, pastoral care",
      memberSince: new Date(2020, i, 15).toISOString(),
      emergencyContactName: "Jane Doe",
      emergencyContactPhone: "(555) 999-0000"
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

    // Create 12-18 members per church with detailed profiles
    const memberCount = 12 + Math.floor(Math.random() * 7);
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
      
      // Add detailed profile information for each member
      const memberSinceYear = 2018 + Math.floor(Math.random() * 6);
      const memberSinceMonth = Math.floor(Math.random() * 12);
      
      await storage.updateUserProfile(member.id, {
        phone: `(555) ${200 + j * 10}-${2000 + j * 100}`,
        address: `${200 + j * 25} Oak Street, City ${i + 1}, State ${10000 + i}`,
        bio: bios[Math.floor(Math.random() * bios.length)],
        dateOfBirth: new Date(1960 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
        education: j % 3 === 0 ? "Bachelor's Degree" : j % 3 === 1 ? "Master's Degree" : "High School",
        maritalStatus: j % 2 === 0 ? "Married" : j % 3 === 0 ? "Single" : "Married",
        familyInfo: j % 2 === 0 ? "Spouse and 2 children" : j % 3 === 0 ? "Single" : "Spouse",
        hobbies: hobbies[Math.floor(Math.random() * hobbies.length)],
        servingAreas: servingAreas[Math.floor(Math.random() * servingAreas.length)],
        baptismDate: j % 2 === 0 ? new Date(memberSinceYear, memberSinceMonth + 2, 15).toISOString() : undefined,
        memberSince: new Date(memberSinceYear, memberSinceMonth, 1).toISOString(),
        emergencyContactName: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        emergencyContactPhone: `(555) ${300 + j}-${3000 + j * 10}`
      });
      
      churchMembers.push(member);
      allUsers.push(member);
    }

    console.log(`  ✓ Created ${memberCount} members with detailed profiles`);

    // Create 4 ministry teams
    const teams = [];
    for (let t = 0; t < 4; t++) {
      const team = await storage.createMinistryTeam({
        churchId: church.id,
        name: ministryTeamNames[i][t],
        description: `Serving God through ${ministryTeamNames[i][t].toLowerCase()}. Join us in making a difference!`,
      });
      teams.push(team);

      // Add 4-7 members to each team
      const teamMemberCount = 4 + Math.floor(Math.random() * 4);
      for (let tm = 0; tm < teamMemberCount && tm < churchMembers.length; tm++) {
        const roles = ["leader", "co_leader", "member", "volunteer"];
        await storage.addTeamMember({
          teamId: team.id,
          userId: churchMembers[tm].id,
          role: tm === 0 ? "leader" : tm === 1 ? "co_leader" : roles[Math.floor(Math.random() * roles.length)],
        });
      }
    }

    console.log(`  ✓ Created 4 ministry teams with members`);

    // Create 8-12 events with variety
    const eventCount = 8 + Math.floor(Math.random() * 5);
    for (let e = 0; e < eventCount; e++) {
      const startDate = new Date();
      const daysOffset = e < 4 ? -7 - e : e - 4; // Mix of past and future events
      startDate.setDate(startDate.getDate() + daysOffset);
      startDate.setHours(10 + Math.floor(Math.random() * 10), 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 2);

      const event = await storage.createEvent({
        churchId: church.id,
        creatorId: adminUser.id,
        title: eventTitles[e % eventTitles.length],
        description: `Join us for ${eventTitles[e % eventTitles.length].toLowerCase()}! This is a wonderful opportunity to connect, grow, and serve together. All ages welcome. Light refreshments will be provided.`,
        location: e % 3 === 0 ? `${church.name} Main Hall` : e % 3 === 1 ? `${church.name} Fellowship Room` : `${church.name} Outdoor Pavilion`,
        startTime: startDate,
        endTime: endDate,
        maxAttendees: 30 + Math.floor(Math.random() * 120),
      });

      // Add RSVPs from members (more for past events)
      const rsvpCount = e < 4 ? Math.min(15, churchMembers.length) : Math.min(8, churchMembers.length);
      for (let r = 0; r < rsvpCount; r++) {
        const statuses = ["going", "going", "going", "maybe", "not_going"]; // More "going" responses
        await storage.upsertRsvp({
          eventId: event.id,
          userId: churchMembers[r].id,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        });
      }
    }

    console.log(`  ✓ Created ${eventCount} events with RSVPs`);

    // Create 8-12 posts with variety
    const postCount = 8 + Math.floor(Math.random() * 5);

    for (let p = 0; p < postCount; p++) {
      const author = p % 4 === 0 ? adminUser : churchMembers[Math.floor(Math.random() * Math.min(5, churchMembers.length))];
      
      await storage.createPost({
        churchId: church.id,
        authorId: author.id,
        title: postTitles[p % postTitles.length],
        content: postContents[p % postContents.length],
        isPinned: p === 0, // Pin the first post
      });
    }

    console.log(`  ✓ Created ${postCount} posts from various members`);

    // Create message channels and conversations
    const channels = await storage.getChannels(church.id);
    if (channels.length > 0) {
      // Add messages to general channel
      const generalChannel = channels.find(c => c.name === "general") || channels[0];

      const messages = [
        "Welcome everyone to our church chat! Feel free to share updates, prayer requests, or just say hello!",
        "Looking forward to this Sunday's service! Pastor mentioned we'll have a special guest speaker.",
        "Does anyone need a ride to Wednesday's Bible study? I have room for 3 people!",
        "Thank you all for the prayers last week! We saw amazing answers to prayer.",
        "Reminder: Youth night this Friday at 7 PM. Bring snacks to share!",
        "Who's coming to the community outreach this Saturday? We need volunteers!",
        "Just wanted to share how blessed I am by this community. You all are amazing!",
        "Prayer request: Please pray for my family as we navigate some challenges this week.",
        "The worship team is looking for new members. If you play an instrument or sing, let us know!",
        "Don't forget about the potluck after service on Sunday. Bring your favorite dish!",
        "Anyone interested in joining the small group study on Thursday evenings?",
        "Grateful for everyone who helped with last week's food drive. We collected over 500 items!"
      ];

      for (let m = 0; m < messages.length; m++) {
        const sender = m === 0 ? adminUser : churchMembers[m % Math.min(churchMembers.length, 8)];
        const messageDate = new Date();
        messageDate.setHours(messageDate.getHours() - (messages.length - m) * 2);
        
        await storage.createMessage({
          channelId: generalChannel.id,
          userId: sender.id,
          content: messages[m],
        });
      }

      console.log(`  ✓ Created ${messages.length} messages with conversation`);
    }

    // Create check-ins for various days
    const checkInDays = 14; // Last 2 weeks
    for (let d = 0; d < checkInDays; d++) {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() - d);
      checkInDate.setHours(10, 0, 0, 0);

      // More check-ins on Sundays and Wednesdays
      const isSunday = checkInDate.getDay() === 0;
      const isWednesday = checkInDate.getDay() === 3;
      
      if (isSunday || isWednesday) {
        const checkInCount = isSunday ? 
          Math.min(Math.floor(churchMembers.length * 0.7), churchMembers.length) : 
          Math.min(Math.floor(churchMembers.length * 0.4), churchMembers.length);
        
        for (let c = 0; c < checkInCount; c++) {
          const isFirstTime = c < 2 && d < 7; // Recent first-time visitors
          await storage.createCheckIn({
            churchId: church.id,
            userId: churchMembers[c % churchMembers.length].id,
            checkInTime: checkInDate,
            notes: isFirstTime ? "First time visitor - excited to be here!" : undefined,
          });
        }
      }
    }

    console.log(`  ✓ Created check-in records for realistic attendance`);
  }

  console.log("\n✅ Comprehensive database seeding completed!");
  console.log(`\n📊 Summary:`);
  console.log(`   - Churches: ${churches.length}`);
  console.log(`   - Total users: ${allUsers.length}`);
  console.log(`   - Each church has:`);
  console.log(`     • 1 admin + 12-18 members (all with detailed profiles)`);
  console.log(`     • 4 ministry teams with 4-7 members each`);
  console.log(`     • 8-12 events (mix of past and upcoming) with RSVPs`);
  console.log(`     • 8-12 posts from various members`);
  console.log(`     • Active conversations in message channels`);
  console.log(`     • Realistic check-in patterns over 2 weeks`);

  console.log(`\n🔑 Test Login Credentials:`);
  for (let i = 0; i < churches.length; i++) {
    console.log(`   Church ${i + 1} Admin: admin${i + 1}@church${i + 1}.com`);
  }

  console.log(`\n💡 Features to explore:`);
  console.log(`   - Browse member profiles with detailed information`);
  console.log(`   - View community feed with multiple posts`);
  console.log(`   - Check upcoming and past events with RSVPs`);
  console.log(`   - Join conversations in message channels`);
  console.log(`   - Explore ministry teams and their members`);
  console.log(`   - Review check-in patterns and attendance`);
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log("\n🎉 Seeding complete! The platform is now fully populated with realistic data.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
