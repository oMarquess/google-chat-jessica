const {AIPService} = require('./services/aip-service');

async function testGroq() {
  try {
    // Test 1: Question Detection
    const testMessage = "What is the weather like today?";
    console.log("\nTesting question detection...");
    console.log(`Input message: "${testMessage}"`);
    const hasQuestion = await AIPService.containsQuestion(testMessage);
    console.log(`Contains question: ${hasQuestion}`);

    // Test 2: Non-Question Statement
    const nonQuestionMessage = "I'm going to the store later today.";
    console.log("\nTesting non-question detection...");
    console.log(`Input message: "${nonQuestionMessage}"`);
    const hasQuestion2 = await AIPService.containsQuestion(nonQuestionMessage);
    console.log(`Contains question: ${hasQuestion2}`);

    // Test 3: Question Answering
    const question = "What is the team's preferred communication channel?";
    const conversationHistory = [
      { text: "Hi everyone! We use Slack for daily communication." },
      { text: "Please remember to check the #announcements channel regularly." }
    ];
    console.log("\nTesting question answering...");
    console.log(`Question: "${question}"`);
    console.log("Conversation history:", conversationHistory.map(m => m.text).join("\n"));
    const answer = await AIPService.answerQuestion(question, conversationHistory);
    console.log(`Answer: ${answer}`);

  } catch (error) {
    console.error("Error during testing:", error);
  }
}

testGroq(); 