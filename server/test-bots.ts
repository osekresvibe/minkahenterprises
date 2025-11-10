
import { storage } from "./storage";
import type { User, Church } from "@shared/schema";

interface BotAction {
  action: string;
  details: string;
  timestamp: Date;
  success: boolean;
}

interface BotReport {
  churchName: string;
  adminEmail: string;
  actions: BotAction[];
  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    featuresUsed: string[];
  };
}

async function logAction(
  report: BotReport,
  action: string,
  details: string,
  success: boolean = true
): Promise<void> {
  report.actions.push({
    action,
    details,
    timestamp: new Date(),
    success,
  });
  console.log(`  ${success ? "✅" : "❌"} ${action}: ${details}`);
}

async function testChurchBot(churchId: string, adminUser: User): Promise<BotReport> {
  const church = await storage.getChurch(churchId);
  if (!church) throw new Error(`Church ${churchId} not found`);

  const report: BotReport = {
    churchName: church.name,
    adminEmail: adminUser.email,
    actions: [],
    summary: {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      featuresUsed: [],
    },
  };

  console.log(`\n🤖 Testing Bot for: ${church.name}`);
  console.log(`   Admin: ${adminUser.email}`);

  try {
    // 1. Update Church Profile
    await storage.updateChurch(churchId, {
      description: `${church.description} - Updated by bot`,
    });
    await logAction(report, "Church Profile Update", "Updated church description");
    report.summary.featuresUsed.push("Church Settings");

    // 2. Create Events
    const eventNames = ["Sunday Service", "Bible Study", "Youth Meeting", "Prayer Night"];
    for (const eventName of eventNames) {
      const event = await storage.createEvent({
        title: eventName,
        description: `${eventName} organized by ${church.name}`,
        startTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: `${church.name} Main Hall`,
        churchId,
        creatorId: adminUser.id,
      });
      await logAction(report, "Create Event", `Created event: ${eventName}`);
    }
    report.summary.featuresUsed.push("Events");

    // 3. Send Invitations
    const testEmails = [
      `newmember1.${churchId}@test.com`,
      `newmember2.${churchId}@test.com`,
    ];
    for (const email of testEmails) {
      try {
        await storage.createInvitation({
          email,
          role: "member",
          churchId,
          invitedBy: adminUser.id,
          token: `test-token-${Date.now()}-${Math.random()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        await logAction(report, "Send Invitation", `Invited ${email}`);
      } catch (error) {
        await logAction(report, "Send Invitation", `Failed to invite ${email}`, false);
      }
    }
    report.summary.featuresUsed.push("Member Invitations");

    // 4. Create Ministry Teams
    const teamNames = ["Worship Team", "Children's Ministry", "Outreach", "Tech Team"];
    const teams = [];
    for (const teamName of teamNames) {
      const team = await storage.createMinistryTeam({
        name: teamName,
        description: `${teamName} at ${church.name}`,
        churchId,
      });
      teams.push(team);
      await logAction(report, "Create Ministry Team", `Created team: ${teamName}`);
    }
    report.summary.featuresUsed.push("Ministry Teams");

    // 5. Add Team Members
    const members = await storage.getUsersByChurch(churchId);
    const regularMembers = members.filter(m => m.role === "member");
    
    for (const team of teams) {
      const membersToAdd = regularMembers.slice(0, Math.min(3, regularMembers.length));
      for (const member of membersToAdd) {
        try {
          await storage.addTeamMember({
            teamId: team.id,
            userId: member.id,
            role: Math.random() > 0.5 ? "leader" : "member",
          });
          await logAction(report, "Add Team Member", `Added ${member.firstName} to ${team.name}`);
        } catch (error) {
          // Member might already be in team, skip
        }
      }
    }
    report.summary.featuresUsed.push("Team Members");

    // 6. Create Posts
    const postTitles = ["Weekly Announcement", "Prayer Request", "Community Update"];
    for (const title of postTitles) {
      await storage.createPost({
        title,
        content: `This is a ${title.toLowerCase()} from ${church.name}. Stay blessed!`,
        churchId,
        authorId: adminUser.id,
      });
      await logAction(report, "Create Post", `Posted: ${title}`);
    }
    report.summary.featuresUsed.push("Posts");

    // 7. Member RSVPs to Events
    const events = await storage.getEvents(churchId);
    for (const member of regularMembers.slice(0, 5)) {
      for (const event of events.slice(0, 2)) {
        const statuses = ["going", "maybe", "not_going"] as const;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        try {
          await storage.upsertRsvp({
            eventId: event.id,
            userId: member.id,
            status,
          });
          await logAction(report, "Event RSVP", `${member.firstName} RSVP'd ${status} to ${event.title}`);
        } catch (error) {
          await logAction(report, "Event RSVP", `Failed RSVP for ${member.firstName}`, false);
        }
      }
    }
    report.summary.featuresUsed.push("Event RSVPs");

    // 8. Check-ins
    for (const member of regularMembers.slice(0, 8)) {
      try {
        await storage.createCheckIn({
          userId: member.id,
          churchId,
          checkInTime: new Date(),
          location: `${church.name} Main Building`,
        });
        await logAction(report, "Check-in", `${member.firstName} checked in`);
      } catch (error) {
        await logAction(report, "Check-in", `Failed check-in for ${member.firstName}`, false);
      }
    }
    report.summary.featuresUsed.push("Check-ins");

    // 9. Messages in Channels
    const channels = await storage.getChannels(churchId);
    for (const channel of channels.slice(0, 3)) {
      for (let i = 0; i < 3; i++) {
        const sender = regularMembers[Math.floor(Math.random() * regularMembers.length)];
        await storage.createMessage({
          channelId: channel.id,
          userId: sender.id,
          content: `Hello from ${sender.firstName}! This is message ${i + 1} in ${channel.name}.`,
        });
        await logAction(report, "Send Message", `${sender.firstName} sent message to #${channel.name}`);
      }
    }
    report.summary.featuresUsed.push("Messages");

    // 10. Update Member Profiles
    for (const member of regularMembers.slice(0, 3)) {
      await storage.updateUser(member.id, {
        bio: `Active member of ${church.name}. Updated by bot.`,
        phone: `555-${Math.floor(Math.random() * 9000) + 1000}`,
      });
      await logAction(report, "Update Profile", `${member.firstName} updated their profile`);
    }
    report.summary.featuresUsed.push("Profile Management");

  } catch (error) {
    await logAction(report, "Error", `Unexpected error: ${error}`, false);
  }

  // Calculate summary
  report.summary.totalActions = report.actions.length;
  report.summary.successfulActions = report.actions.filter(a => a.success).length;
  report.summary.failedActions = report.actions.filter(a => !a.success).length;

  return report;
}

async function runBotTests() {
  console.log("\n🚀 Starting Comprehensive Bot Testing...\n");
  console.log("=" .repeat(60));

  const churches = await storage.getAllChurches();
  const approvedChurches = churches.filter(c => c.status === "approved");

  if (approvedChurches.length === 0) {
    console.log("❌ No approved churches found. Please run seed script first.");
    return;
  }

  const reports: BotReport[] = [];

  for (const church of approvedChurches) {
    const admin = await storage.getUser(church.adminUserId);
    if (!admin) continue;

    const report = await testChurchBot(church.id, admin);
    reports.push(report);
  }

  // Print Final Report
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 FINAL BOT TESTING REPORT\n");
  console.log("=".repeat(60));

  for (const report of reports) {
    console.log(`\n🏛️  ${report.churchName}`);
    console.log(`   Admin: ${report.adminEmail}`);
    console.log(`   Total Actions: ${report.summary.totalActions}`);
    console.log(`   ✅ Successful: ${report.summary.successfulActions}`);
    console.log(`   ❌ Failed: ${report.summary.failedActions}`);
    console.log(`   Features Used: ${report.summary.featuresUsed.join(", ")}`);
    console.log(`   Success Rate: ${((report.summary.successfulActions / report.summary.totalActions) * 100).toFixed(1)}%`);
  }

  // Overall Statistics
  const totalActions = reports.reduce((sum, r) => sum + r.summary.totalActions, 0);
  const totalSuccessful = reports.reduce((sum, r) => sum + r.summary.successfulActions, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.summary.failedActions, 0);
  const allFeaturesUsed = new Set(reports.flatMap(r => r.summary.featuresUsed));

  console.log("\n" + "=".repeat(60));
  console.log("\n📈 OVERALL STATISTICS\n");
  console.log(`   Churches Tested: ${reports.length}`);
  console.log(`   Total Actions Performed: ${totalActions}`);
  console.log(`   ✅ Total Successful: ${totalSuccessful}`);
  console.log(`   ❌ Total Failed: ${totalFailed}`);
  console.log(`   Overall Success Rate: ${((totalSuccessful / totalActions) * 100).toFixed(1)}%`);
  console.log(`   Unique Features Tested: ${allFeaturesUsed.size}`);
  console.log(`   Features: ${Array.from(allFeaturesUsed).join(", ")}`);

  console.log("\n" + "=".repeat(60));
  console.log("\n✨ Bot testing completed!\n");
}

// Run the bot tests
runBotTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Bot testing failed:", error);
    process.exit(1);
  });
