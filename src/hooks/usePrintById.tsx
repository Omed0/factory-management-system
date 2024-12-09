import { useCallback } from "react";

// Define a type for the options
type PrintOptions = {
  tailwindClasses?: string;
  customStyles?: string;
};

/**
 * Custom hook to print a section of a page by its ID with predefined styles
 * @param options Styles to apply to the printed section
 * @returns Function to trigger the print
 */
const usePrintById = (options?: PrintOptions) => {
  const { tailwindClasses = "", customStyles = "" } = options || {};

  return useCallback((id: string) => {
    const sectionToPrint = document.getElementById(id);

    if (!sectionToPrint) {
      console.warn(`Element with id "${id}" not found.`);
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      console.error("Failed to open print window.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print</title>
          <style>
            body {
              font-family: var(--font-unisirwan), Arial, sans-serif;
            }
            ${customStyles}
          </style>
          <script>
            window.onload = function() {
              document.getElementById('print-section').className = '${tailwindClasses}';
            };
          </script>
        </head>
        <body>
          <div id="print-section">${sectionToPrint.outerHTML}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  }, [tailwindClasses, customStyles]);
};

export default usePrintById;
