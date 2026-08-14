# 🐉 BDH Inspector 

A small web microscope for Pathway's **Dragon Hatchling (BDH)** architecture. It visualizes real per-layer activation statistics like shapes, sparsity, mean / std / min / max, and samples, captured by instrumenting the official public model with forward hooks. 

**🔗 Live demo: https://brainy-joseph.github.io/-dragonforge-bdh-inspector/**
*(no install, no local server, just open the link)*

**Team Members:** Aarav Srivastava, Prakhar Yadav, Rudranshu Singhal, Yusuf Abbas 

---

## 1️⃣ Project Description

**Why we built it:**
As neural network architectures evolve beyond standard Transformers, understanding their internal mechanics becomes increasingly difficult. We built BDH Inspector to demystify novel, biologically-inspired architectures by providing a transparent, accessible look into their internal latent spaces. 

**Why the problem matters:**
Pathway's Dragon Hatchling (BDH) introduces a post-Transformer architecture with unique properties like sparse, ReLU-gated latent spaces. However, without tooling to inspect these internal activations, validating theoretical claims or debugging signal propagation in these complex models is extremely challenging. Interpretability tooling is essential for the development, validation, and trust of next-generation AI models.

**Scientific & Development Contributions:**
We contribute a dependency-free, open-source "web microscope" alongside a reusable Python instrumentation pipeline. By capturing tensor statistics during forward passes, our project establishes an empirical baseline for freshly initialized BDH models. Furthermore, the same pipeline can be applied to trained checkpoints to study emergent phenomena, bridging the gap between theoretical papers and practical implementation.

---

## 2️⃣ Product Demo

**🔗 [Try the Live Web Microscope Here](https://brainy-joseph.github.io/-dragonforge-bdh-inspector/)**



---

## 3️⃣ Reproducibility

To replicate our results or run the microscope on your own BDH checkpoint, follow these steps:

1. **Instrumentation:** 
   Run `test.py` in a codespace or environment containing the official [pathwaycom/bdh](https://github.com/pathwaycom/bdh) repository. The script loads `bdh.py`, registers PyTorch forward hooks on every module (`embed`, `ln`, `attn`, `drop`), runs 3 test prompts, and exports the activation statistics to `bdh_microscope_rich.json`.
2. **Data Conversion:** 
   Convert the JSON output into a JavaScript module (`const BDH_DATA = {...}`) and save it as `data.js`.
3. **Local Viewing:** 
   Open `index.html` in your browser to render the dependency-free static site locally, which reads from `data.js` to display the pipeline and statistics.

---

## 4️⃣ Performance Metrics & Findings

Our solution captures precise statistical metrics to evaluate signal propagation and sparsity within the architecture. We chose these specific metrics because they directly validate the mathematical and biological claims made in the original BDH paper for an untrained model.

**Key Metrics Captured:**
* **Strictly-Causal Attention Fingerprint:** Attention-output sparsity is exactly `1/T` (e.g., 1/11, 1/19, 1/43 depending on the prompt). This metric confirms the `tril(diagonal=-1)` mask logic, as the first token sees nothing.
* **Gated Sparsity:** We measured a consistent sparsity of **≈ 0.76–0.77** at every level. This metric was chosen because it perfectly aligns with the theoretical expectation of two ~50%-sparse ReLU latents being multiplied (`1 − 0.5² = 0.75`).
* **Drop Module Sparsity:** Scrolling through the layers, the `drop` module consistently stood out with **~77.4% zeros** across all 6 repeated levels, confirming theoretical gating mechanics.
* **Signal Amplification:** We tracked the standard deviation of attention outputs level by level. It grows consistently (e.g., ≈309 → 442 → 581 → 685 on the prompt "The cat sat"), showing how the untrained architecture propagates signals.

**What you can visualize in the tool:**
* **Pipeline:** The layer sequence across all 6 repeated levels, with exact tensor shapes.
* **Activations:** Side-by-side comparison of the same statistics across 3 different prompts.
* **Layer stats:** Click any layer in the tree to see numel, mean, std, min/max, sparsity, and a sample sparkline.

### An Honest Note on Untrained Weights
The official `pathwaycom/bdh` repository ships **no pretrained weights**, so every number here describes the *freshly initialized* architecture. Trained-model phenomena from the paper (e.g., monosemantic synapses) are **established in the paper, not measured here**. Our instrumentation script can be seamlessly re-run on any trained checkpoint to extend these views and evaluate post-training metrics.

---

## Roadmap

- [ ] Attention score heatmaps (raw strictly-causal Q·Kᵀ, per head and level)
- [ ] RoPE phase visualization from the `freqs` buffer
- [ ] Before/after training comparison (diff two instrumentation runs)
- [ ] More prompts and longer sequences

---

## 5️⃣ Credits


**Special thanks to our partners for their support and infrastructure:**
🤝 **Pathway**  
🤝 **Rime**  
🤝 **Weya**  
🤝 **Qdrant**  

**Architecture & Code:** 
* [pathwaycom/bdh](https://github.com/pathwaycom/bdh) (MIT)
* Paper: *The Dragon Hatchling: The Missing Link between the Transformer and Models of the Brain* — [arXiv:2509.26507](https://arxiv.org/abs/2509.26507)

This project was developed by our team: **Aarav Srivastava, Prakhar Yadav, Rudranshu Singhal, and Yusuf Abbas**.


---

## License

MIT