# BGE-small-zh-v1.5 (ONNX)

- 模型：BAAI/bge-small-zh-v1.5
- 用途：本地中文语义检索，只处理文本，不处理影像
- 运行：ONNX Runtime CPU
- 文件：model.onnx + model.onnx_data + tokenizer.json
- 来源：Hugging Face / BAAI
- License: MIT（以模型卡为准）
- 不在线调用；如果模型文件缺失，RAG 自动回退 BM25/TF-IDF
