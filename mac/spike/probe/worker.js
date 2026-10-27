// A module worker with an import of its own, as the cubing.js search worker is.
import { double } from './worker-dep.js';
self.onmessage = e => self.postMessage({ result: double(e.data), origin: self.location.origin });
