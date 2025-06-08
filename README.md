# Jira Enhancer Chrome Extension

https://github.com/rsallar/jira-board-enhancer-plugin/blob/master/public/images/icon128.png

Jira Enhancer is a browser extension designed to supercharge your Jira board experience. It injects a set of powerful, quality-of-life features directly into the Jira interface, helping you and your team stay more organized and efficient.

This extension focuses on providing clearer visibility into sub-tasks, enabling faster status updates, and optimizing screen real-estate, all without leaving your board.

---

## ✨ Features

-   **Inline Sub-Task Display**: See all sub-tasks directly on the parent issue card. No more clicking into each issue to check sub-task status.
-   **Quick Status Change**: Update the status of any sub-task directly from the board view with a custom status selector.
-   **Collapsible First Column**: Collapse the first column of any swimlane to maximize horizontal space, perfect for focusing on `In Progress` or `Done` columns.
-   **Enhanced Tooltips**: Custom, non-intrusive tooltips for long sub-task titles.
-   **Assignee & Priority Visibility**: Key information like assignee avatars and priority icons are clearly visible for each sub-task.

---

## 🛠️ Board Requirements & Configuration

For the extension to function correctly, your Jira board must be configured in a specific way.

### 1. Enable Swimlanes
The feature to collapse the first column is only available on boards that are organized by **Swimlanes**. You can configure this in `Board settings` → `Swimlanes` and group by "Assignees", "Epics", "Queries", etc.

### 2. Add "Sub-Tasks" Field to Cards
To display the inline sub-tasks, you must add the "Sub-Tasks" field to your card layout.
-   Navigate to your board.
-   Go to **Board settings → Card layout**.
-   Add **"Sub-Tasks"** to the list of displayed fields for your issue types.

 
*<-- Replace this with a URL to your screenshot showing the "Card layout" settings.*

---

## 🚀 Installation

### From the Chrome Web Store (Recommended)

*Coming soon! Once the extension is published, a link will be available here.*

### Manual Installation (For Development)

If you want to install the extension from the source code:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/jira-enhancer.git
    ```
2.  **Open Chrome and navigate to the Extensions page:**
    -   Go to `chrome://extensions` or click the puzzle icon → `Manage Extensions`.
3.  **Enable Developer Mode:**
    -   Toggle the "Developer mode" switch in the top-right corner.
4.  **Load the extension:**
    -   Click the **"Load unpacked"** button.
    -   Select the directory where you cloned the repository.

The Jira Enhancer icon should now appear in your browser's toolbar.

---

## ⚙️ How to Use

1.  After installing, click on the Jira Enhancer icon in your browser toolbar to open the options page.
2.  Add the base URL of your Jira instance (e.g., `https://your-company.atlassian.net`) and click "Add". The extension will request the necessary permissions and activate itself on that domain.
3.  Navigate to your configured Jira board, and the new features will be automatically enabled!

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please feel free to:

1.  **Open an Issue**: Describe the bug or feature proposal.
2.  **Fork the Repository**: Create your own copy of the project.
3.  **Create a Pull Request**: Submit your changes for review.

Please ensure your code follows the existing style and that you've tested your changes thoroughly.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
