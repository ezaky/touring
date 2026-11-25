import AppLauncher from "./whiz/app/AppLauncher";
import ModuleMap from "./ModuleMap";
import "./app/TouringApp";
import '@web.awesome.me/webawesome-pro/dist/styles/themes/default.css';
import '@web.awesome.me/webawesome-pro/dist/styles/utilities.css';
import '@web.awesome.me/webawesome-pro/dist/styles/native.css';
import './app/Main.css';
import BaseComponent from "./whiz/components/BaseComponent";

function launchApp() {
    // give touring-app a chance to render before calling querySelector
    setTimeout(() => {
        let app = <BaseComponent>document.querySelector("touring-app");
        new AppLauncher().launch({
            app,
            elem: app.querySelector(".app-content"),
            webModulesMap: ModuleMap
        });
    }, 1)
}

launchApp();