import { definePlugin } from "@decky/api";
import { staticClasses } from "@decky/ui";
import { FaSyncAlt } from "react-icons/fa";
import { Terminal } from "./components";

export default definePlugin(() => ({
  name: "CachyOS Update",
  titleView: <div className={staticClasses.Title}>CachyOS Update</div>,
  // Keeps the panel mounted so streamed output is never missed while the
  // quick-access menu is closed.
  alwaysRender: true,
  content: <Terminal />,
  icon: <FaSyncAlt />,
}));
