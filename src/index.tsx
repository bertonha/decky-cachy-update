import { definePlugin } from "@decky/api";
import { staticClasses } from "@decky/ui";
import { FaSyncAlt } from "react-icons/fa";
import { Terminal } from "./components";

export default definePlugin(() => ({
  name: "CachyOS Update",
  titleView: <div className={staticClasses.Title}>CachyOS Update</div>,
  alwaysRender: true,
  content: <Terminal />,
  icon: <FaSyncAlt />,
  onDismount() {
    console.log("CachyOS Update plugin unmounted");
  },
}));
