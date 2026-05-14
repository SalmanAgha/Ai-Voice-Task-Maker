import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const now = new Date();

    // Save the User's message to DB
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await prisma.message.create({
        data: { role: 'user', content: lastUserMessage.content }
      });
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task or reminder for the user.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The title of the task.' },
              description: { type: 'string', description: 'Brief details about the task.' },
              category: { type: 'string', enum: ['Work', 'Personal', 'Meeting', 'Reminder', 'General'], description: 'Type of task.' },
              scheduledFor: { type: 'string', description: 'ISO 8601 date string for when the task is due.' },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_tasks',
          description: 'Get a list of tasks, optionally filtered by time.',
          parameters: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_task',
          description: 'Update an existing task.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'completed'] },
              scheduledFor: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_task',
          description: 'Delete a task by ID. Use ONLY if the user says YES to a confirmation.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_all_tasks',
          description: 'Deletes every single task. Use ONLY if the user says YES to a confirmation.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an institutional-grade Voice Task Manager. 
          Your goal is to manage the user's agenda via voice.
          
          CRITICAL RULES:
          1. ONLY call ONE tool per user request for task creation. Never create multiple versions of the same task.
          2. If a user says "Remind me to...", create ONE task with the title and set the 'scheduledFor' time.
          3. ALWAYS confirm destructive actions (like delete) by asking "Are you sure?" first.
          4. If the user is vague, ask for clarification.
          5. Use ISO 8601 for dates/times. The current time is ${now.toISOString()}.`,
        },
        ...messages,
      ],
      tools: tools as any,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      messages.push(responseMessage);
      let taskCreatedThisTurn = false;

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const functionName = toolCall.function.name;
        
        try {
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          let functionResult: any;

          if (functionName === 'create_task') {
            if (taskCreatedThisTurn) continue;
            functionResult = await prisma.task.create({
              data: {
                title: functionArgs.title,
                description: functionArgs.description,
                category: functionArgs.category || 'General',
                scheduledFor: functionArgs.scheduledFor ? new Date(functionArgs.scheduledFor) : null,
              },
            });
            taskCreatedThisTurn = true;
          } else if (functionName === 'get_tasks') {
            functionResult = await prisma.task.findMany({ 
              orderBy: { scheduledFor: 'asc' }
            });
          } else if (functionName === 'update_task') {
            functionResult = await prisma.task.update({
              where: { id: functionArgs.id },
              data: {
                title: functionArgs.title,
                status: functionArgs.status,
                scheduledFor: functionArgs.scheduledFor ? new Date(functionArgs.scheduledFor) : null,
              },
            });
          } else if (functionName === 'delete_task') {
            functionResult = await prisma.task.delete({
              where: { id: functionArgs.id },
            });
          } else if (functionName === 'delete_all_tasks') {
            functionResult = await prisma.task.deleteMany({});
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult),
          });
        } catch (error) {
          console.error(error);
        }
      }

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent, voice-based task management assistant. Keep your response concise and natural.',
          },
          ...messages,
        ],
      });

      const finalAssistantMessage = secondResponse.choices[0].message;
      
      if (finalAssistantMessage.content) {
        await prisma.message.create({
          data: { role: 'assistant', content: finalAssistantMessage.content }
        });
      }

      return NextResponse.json({
        message: finalAssistantMessage,
        messages: [...messages, finalAssistantMessage],
        hasUpdates: true,
      });
    }

    if (responseMessage.content) {
      await prisma.message.create({
        data: { role: 'assistant', content: responseMessage.content }
      });
    }

    return NextResponse.json({
      message: responseMessage,
      messages: [...messages, responseMessage],
      hasUpdates: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
