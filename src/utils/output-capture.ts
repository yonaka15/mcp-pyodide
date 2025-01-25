import { PyodideInterface } from "pyodide";

// Class for capturing standard output
class OutputCapture {
  private output: string[] = [];

  capture(text: string): void {
    if (text) {
      this.output.push(text);
    }
  }

  getOutput(): string {
    return this.output.join("\n");
  }

  clear(): void {
    this.output = [];
  }

  setupOutput(pyodide: PyodideInterface): void {
    pyodide.setStdout({
      batched: (text: string) => this.capture(text),
    });

    pyodide.setStderr({
      batched: (text: string) => this.capture(text),
    });
  }
}

const withOutputCapture = async <T>(
  pyodide: PyodideInterface,
  operation: (capture: OutputCapture) => Promise<T>,
  options: {
    suppressConsole?: boolean; // Suppress console output
  } = {}
): Promise<{ result: T; output: string }> => {
  const outputCapture = new OutputCapture();
  outputCapture.setupOutput(pyodide);

  // Save the original console function
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  // Override console output
  console.log = (text: string) => {
    outputCapture.capture(text);
    if (!options.suppressConsole) {
      originalConsoleLog(text);
    }
  };

  console.error = (text: string) => {
    outputCapture.capture(text);
    if (!options.suppressConsole) {
      originalConsoleError(text);
    }
  };

  try {
    // Execute the operation
    const result = await operation(outputCapture);
    return {
      result,
      output: outputCapture.getOutput(),
    };
  } finally {
    // Restore the original console output
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
};

export { withOutputCapture };
