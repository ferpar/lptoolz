import { Eip1193Provider } from "ethers"
// this is a global type declaration
// it affects the global scope
// it is used to prevent typescript errors when using window.ethereum
declare global {
  interface Window {
    ethereum: Eip1193Provider
  }
}
