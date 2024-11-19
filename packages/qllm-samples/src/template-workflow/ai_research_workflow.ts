import { createLLMProvider } from "qllm-lib";
import {
  TemplateDefinitionBuilder,
  WorkflowManager,
  WorkflowDefinition,
  WorkflowStep,
  StepType,
  LoadDocumentFromTextFile,
  SaveDocument
} from "qllm-lib";

async function main(): Promise<void> {
  console.log("\n🔍 Debug - Starting template definitions");
 

  // 3 : trnaslator
  const languageTranslator = TemplateDefinitionBuilder.create({
    name: "🌐 Universal Language Translator",
    version: "1.0.0",
    description: "🔄 Translate text between multiple languages with context awareness",
    author: "🤖 TranslatorAI",
    content: `
    ## Translate the following text:

    <source_text>
    {{text_to_translate}}
    </source_text>

    Source Language: {{source_language}}
    Target Language: {{target_language}}

    Requirements:
    - Maintain the original meaning and context
    - Preserve formatting and special characters
    - Consider cultural nuances and idioms
    - Provide alternative translations for ambiguous terms
    - Keep the style consistent with the source text
    
    ## Always include the Output in Format :

    <translation>
    The translated text
    </translation>

    END.
    `,
})
    .withInputVariable(
        "text_to_translate",
        "string",
        "📝 The text that needs to be translated",
    )
    .withInputVariable(
        "source_language",
        "string",
        "🔤 The language of the source text",
    )
    .withInputVariable(
        "target_language",
        "string",
        "🎯 The desired language for translation",
    )
    .withOutputVariable("translation", "string", {
        description: "🔄 The translated text",
    })
    .withTags("🌐 translation", "🔤 language", "🌍 localization")
    .withCategories("📚 Language Processing", "🤖 AI-Assisted Translation")
    .withModel("gpt-4")
    .withParameters({
        max_tokens: 1000,
        temperature: 0.3,
        top_p: 0.95,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
    })
    .withPromptType("🔤 language_translation")
    .withTaskDescription(
        "🎯 Provide accurate and context-aware translations between different languages",
    )
    .build();

    // 4: lerning tempalte

    const learningArticleGenerator = TemplateDefinitionBuilder.create({
      name: "📚 Impatient Learner's Guide Generator",
      version: "1.0.0",
      description: "🚀 Generate engaging learning article for quick mastery",
      author: "🤖 LearningAI",
      content: `
      ## Expert Profile Configuration

      You are a world-renowned expert in {{subject}} with:
      - Decades of practical experience
      - Strong academic background
      - Industry leadership position
      - Track record of mentoring impatient learners

      ## Article Generation Parameters

      Topic: {{subject}} for the Impatient: From Novice to Practitioner in Record Time
      Word Count: {{number_words}}
      Additional Requirements: {{additional_requirements}}

      ## Content Structure Requirements

      1. Assessment Phase:
      <assessment>
      - Subject matter expertise validation
      - Resource availability check
      - Learning path feasibility analysis
      </assessment>

      2. Chapter Content:
      <chapter>
      - Why: Motivation and real-world applications
      - What: Core concepts and principles
      - How: Practical implementation
      - When: Usage scenarios and best practices
      
      Include:
      - Practical examples (progressive complexity)
      - Interactive elements
      - Pro tips and shortcuts
      - Common pitfalls
      - Action items
      </chapter>

      3. Visual Elements:
      <diagrams>
      - Mermaid diagrams for complex concepts
      - Process flows
      - Relationship maps
      - State transitions
      </diagrams>

      ## Always include the Output in Format :

      <article>
      [Generated article following the structure above]
      </article>

      <next_steps>
      [Instructions for continuing if incomplete]
      </next_steps>

      END.
      `,
  })
      .withInputVariable(
          "subject",
          "string",
          "📚 The subject to be taught",
      )
      .withInputVariable(
          "number_words",
          "string",
          "📏 Target word count for the article",
      )
      .withInputVariable(
          "additional_requirements",
          "string",
          "➕ Any additional specific requirements",
      )
      .withOutputVariable("article", "string", {
          description: "📖 Generated article content",
      })
      .withOutputVariable("next_steps", "string", {
          description: "⏭️ Continuation instructions",
      })
      .withTags("📚 education", "🎓 learning", "⚡ quick mastery")
      .withCategories("🎯 Educational Article", "🤖 AI-Assisted Learning")
      .withModel("gpt-4")
      .withParameters({
          max_tokens: 2000,
          temperature: 0.2,
          top_p: 0.95,
          presence_penalty: 0.2,
          frequency_penalty: 0.3,
      })
      .withPromptType("📝 educational_article")
      .withTaskDescription(
          "🎯 Generate comprehensive, engaging learning article for impatient learners",
      )
      .build();

  // Create providers
  const providers = {
    openai: createLLMProvider({
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY
    })
  };

  // Initialize workflow manager
  const workflowManager = new WorkflowManager(providers);

  // Define the workflow
  const workflowDefinition: WorkflowDefinition = {
    name: "ai_research_workflow",
    description: "Analyze AI articles and generate debate analysis",
    defaultProvider: "openai",
    steps: [
      {
        program: new LoadDocumentFromTextFile(),
        type: StepType.ACTION,
        input: {
          path: "./data/document.txt"
        },
        output: {
          content: "document_content"
        }
      },
      {
        template: learningArticleGenerator,
        type: StepType.INTERNAL,
        provider: "openai",
        input: {
          subject: "$document_content",
          number_words: "{{number_words}}",
          additional_requirements: "{{additional_requirements}}"
        },
        output: {
          article: "learning_article",
          next_steps: "learning_next_steps"
        }
      },
      {
        template: languageTranslator,
        type: StepType.INTERNAL,
        provider: "openai",
        input: {
          text_to_translate: "$learning_article",
          source_language: "{{source_language}}",
          target_language: "{{target_language}}"
        },
        output: {
          translation: "final_translation"
        }
      },
      {
        program: new SaveDocument(),
        type: StepType.ACTION,
        input: {
          content: "$final_translation",
          fileName: "output_test1.txt" //retirer la variable fileName pour le nom du fichier dynamique avec timestamp
        },
        output: {
          path: "saved_file_path", 
          message: "save_message"
        }
      }
    ]
  };

  try {
    // Load workflow
    await workflowManager.loadWorkflow(workflowDefinition);
    console.log("\n✅ Workflow loaded successfully");
    const workflowInput = {
      subject: "TypeScript",
      number_words: "1500",
      additional_requirements: "Focus on practical applications and modern development practices",
      source_language: "English",
      target_language: "Spanish",
    };

    // Execute workflow with progress tracking
    const result = await workflowManager.runWorkflow(
      "ai_research_workflow",
      workflowInput,
      {
        onStepStart: (step: WorkflowStep, index: number) => {
          console.log(`\n🔍 Starting step ${index + 1}: ${step.template?.name || step.program?.constructor.name}`);
        },
        onStepComplete: (step: WorkflowStep, index: number) => {
          console.log(`\n✅ Completed step ${index + 1}: ${step.template?.name || step.program?.constructor.name}`);
        }
      }
    );

    console.log("\n🎉 Workflow completed successfully");
    console.log("\nFinal Results:", JSON.stringify(result, null, 4));

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
});

// Run the main function
main().catch((error) => {
  console.error("\n💥 Fatal Error:", error);
  process.exit(1);
});