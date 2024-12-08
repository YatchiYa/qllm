import { createLLMProvider, TemplateExecutor, TemplateLoader } from "qllm-lib";
import {
    TemplateDefinition,
    TemplateDefinitionBuilder,
} from "qllm-lib";



async function main(): Promise<void> {
    var documentSummarizer = await TemplateLoader.load("https://github.com/YatchiYa/templates_prompts_qllm/blob/main/templates/a0e0e6fe-fd9a-491e-a3f6-4cb42facfed0/3f48dfee-353c-4718-94c5-0b3fa161409f/ggggggggggggggg.yaml");
    
    console.log("🏗️ Generated Template:");
    console.log(documentSummarizer);

    const result = await executeTemplate(documentSummarizer);
    console.log("🎉 Template execution result:");
    console.log(result);

    documentSummarizer = await TemplateLoader.load("https://github.com/YatchiYa/templates_prompts_qllm/blob/main/templates/a0e0e6fe-fd9a-491e-a3f6-4cb42facfed0/3f48dfee-353c-4718-94c5-0b3fa161409f/ggggggggggggggg.yaml");
    await TemplateLoader.clearCache(); 

    const result_v = await executeTemplate(documentSummarizer);
    console.log("🎉 Template execution result_v:");
    console.log(result_v);

    documentSummarizer = await TemplateLoader.load("https://github.com/YatchiYa/templates_prompts_qllm/blob/main/templates/a0e0e6fe-fd9a-491e-a3f6-4cb42facfed0/3f48dfee-353c-4718-94c5-0b3fa161409f/ggggggggggggggg.yaml");
    await TemplateLoader.clearCache(); 

    const result_vvv = await executeTemplate(documentSummarizer);
    console.log("🎉 Template execution result_vvv:");
    console.log(result_vvv);

    
}

async function executeTemplate(templateDefinition: TemplateDefinition) {
    // Execute the template
    const provider = createLLMProvider({ name: "openai" });
    const templateExecutor = new TemplateExecutor();
    console.log("templateExecutor : ", templateExecutor)
    const executionResult = templateExecutor.execute({
        template: templateDefinition,
        provider: provider,
        variables: {
            doc: "https://raw.githubusercontent.com/raphaelmansuy/digital_palace/refs/heads/main/01-articles/board_of_experts/README.md"
        },
        stream: true,
    });

    templateExecutor.on("requestSent", (request) => {
        console.log("🚀 Request sent:");
        console.dir(request, { depth: null });
    });

    templateExecutor.on("streamChunk", (chunk: string) => {
        process.stdout.write(chunk);
    });


    templateExecutor.on("streamComplete", async () => {
        const result = await executionResult;
        console.log("=========end=======")
        templateExecutor.removeAllListeners();
      });

    return executionResult;
}

main()
    .then(() => {
        console.log("✅ Finished running the document summarizer.");
    })
    .catch((err) => {
        console.error(
            "❌ An error occurred while running the document summarizer:",
            err,
        );
    });

