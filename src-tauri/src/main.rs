// анти консоль для винды нах
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    dumb_messenger_lib::run()
}
