const {AIPService} = require('./services/aip-service');

async function testInteractions() {
  const testCases = [
    {
      type: "Greeting",
      message: "Hi Jessica! Nice to meet you!"
    },
    {
      type: "Gratitude",
      message: "Thanks for all your help today!"
    },
    {
      type: "Knowledge Sharing",
      message: "Our team uses JIRA for project management and tracking tasks."
    },
    {
      type: "Emotional",
      message: "I'm really excited about our new project launch!"
    },
    {
      type: "Command/Request",
      message: "Please remind the team about tomorrow's meeting."
    },
    {
      type: "General Statement",
      message: "I'm going to get some coffee."
    }
  ];

  try {
    for (const test of testCases) {
      console.log(`\nTesting ${test.type} Message`);
      console.log(`Input: "${test.message}"`);
      
      // First, analyze the message type
      const messageType = await AIPService.analyzeMessageType(test.message);
      console.log(`Detected Type: ${messageType}`);
      
      // Then get the appropriate response
      const response = await AIPService.handleNonQuestion(messageType, test.message);
      console.log(`Response: ${response || '(no response needed)'}`);
      console.log('-'.repeat(50));
    }
  } catch (error) {
    console.error("Error during testing:", error);
  }
}

testInteractions(); 