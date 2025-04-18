export default function formatConvHistory(messages: any) {
    return messages
      .map((message: string, i: number) => {
        if (i % 2 === 0) {
          return `Human: ${message}`;
        } else {
          return `AI: ${message}`;
        }
      })
      .join(`\n`);
  }
  