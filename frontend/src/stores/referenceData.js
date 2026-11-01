/** Reference content and deterministic initial state owned by the Pinia store layer. */
import { IMAGE_UPLOAD, PROB_THRESHOLD, VIEWER_DEFAULTS, VIEWER_ZOOM } from '../constants/app.js';
    /**
     * 一、全局常量定义 (对应 src/utils/constant.js，严禁魔法数字)
     */
    const MAX_IMAGE_SIZE = IMAGE_UPLOAD.maxImageBytes;
    const ALLOWED_IMAGE_TYPES = IMAGE_UPLOAD.allowedTypes;
    const SAMPLE_IMAGES = {
      ABNORMAL: '/assets/sample_2.jpg',
      NORMAL: '/assets/sample_3.jpg'
    };

    /**
     * 二、10 类胸部常见X光疾病完整科普知识库 (对应 src/api/modules/knowledge.js)
     */
    const DISEASE_KNOWLEDGE_LIST = [
      {
        code: 'pneumonia',
        name: '肺炎 (Pneumonia)',
        shortName: '肺炎',
        severity: 'HIGH',
        severityLabel: '需及时诊疗',
        image: '/assets/knowledge/source-pneumonia.jpg',
        imageAlt: '胸部X光示例：肺炎表现为肺野局灶性片状阴影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:X-ray_of_lobar_pneumonia.jpg',
        hotspots: [
          { x: 56, y: 64, title: '片状密度增高影', text: '示例片可见局部肺野密度增高。真实影像需由医生结合体征与检查判断。' },
          { x: 46, y: 45, title: '观察肺野分布', text: '比较双侧肺野透亮度与纹理，留意阴影的范围、边缘及分布。' }
        ],
        xrayFeature: '肺野内局灶性或肺叶分布的斑片状、云絮状密度增高影，边缘模糊，可伴支气管充气征。',
        overview: '肺炎是指终末气道、肺泡和肺间质的急性或慢性感染性炎症。在胸部X光正位片上，由于肺泡内充满炎性渗出物替代了正常含气腔隙，常表现为片状或斑片状浸润阴影，常见于右下肺野及双肺下叶。',
        causes: '常见病原体包括细菌（如肺炎链球菌、金黄色葡萄球菌）、非典型病原体（肺炎支原体、衣原体）及呼吸道病毒（流感病毒、腺病毒等）。淋雨受凉、过度劳累、吸烟或免疫力下降是常见诱发因素。',
        symptoms: '典型临床表现为急性起病的发热、寒战、咳嗽、咳痰（铁锈色痰或脓性痰），部分患者伴有病变侧胸痛（深呼吸或咳嗽时加重）及呼吸急促。',
        prevention: '保持室内空气流通，秋冬流感高发季注意佩戴口罩与手卫生；规律作息、适度有氧运动增强体质；老年人及慢性病患者建议接种肺炎球菌疫苗与流感疫苗。若胸片提示斑片影伴发热，应及时前往呼吸内科抗感染治疗。'
      },
      {
        code: 'nodule',
        name: '肺结节 (Pulmonary Nodule)',
        shortName: '肺结节',
        severity: 'MEDIUM',
        severityLabel: '定期随访复查',
        image: '/assets/knowledge/nodule.jpg',
        imageAlt: '胸部X光示例：肺内可见圆形结节影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Chest_X-ray_of_discrete_round_nodules_after_secondary_tuberculosis.jpg',
        hotspots: [
          { x: 60, y: 39, title: '圆形结节影', text: '标记处为示例片中描述的圆形结节影。胸片无法可靠评估所有小结节，通常需结合CT。' },
          { x: 41, y: 57, title: '比较两侧肺野', text: '阅片时需比较两侧肺野，并结合既往影像判断变化；单个标记不能代表完整检查。' }
        ],
        xrayFeature: '肺实质内直径 ≤ 30mm 的类圆形局灶性密度增高影，边界可清晰或呈分叶/毛刺状。',
        overview: '肺结节是指影像学上表现为直径 ≤ 3cm 的局灶性、类圆形、密度增高的实性或亚实性肺部阴影，不伴肺不张、肺门肿大和胸腔积液。胸片通常对 ≥ 8-10mm 的实性结节具有较高检出率，更微小的磨玻璃结节需借助低剂量螺旋CT进一步评估。',
        causes: '肺结节病因多样，绝大多数（80%-90%以上）为良性病变，包括既往肺部感染或结核痊愈后遗留的陈旧性肉芽肿、炎性假瘤、局灶性肺纤维化或错构瘤；少数可能为早期原发性肺癌或转移性病灶。',
        symptoms: '绝大多数偶发肺结节患者无任何自觉症状，往往在常规体检胸片或胸部CT筛查时被发现。',
        prevention: '发现肺结节无需过度恐慌，建议携带影像前往胸外科或呼吸科门诊，结合年龄、吸烟史及结节大小制定薄层CT随访计划（如3个月、6个月或1年复查）；日常生活中应严格戒烟并远离二手烟、厨房油烟与石棉粉尘。'
      },
      {
        code: 'effusion',
        name: '胸腔积液 (Pleural Effusion)',
        shortName: '胸腔积液',
        severity: 'HIGH',
        severityLabel: '需查明病因',
        image: '/assets/knowledge/effusion.jpg',
        imageAlt: '胸部X光示例：胸腔积液造成下肺野均匀致密影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Pleural_effusion.jpg',
        hotspots: [
          { x: 59, y: 72, title: '肋膈角区域', text: '胸腔积液可使肋膈角变钝，示例图用于帮助认识下胸廓外侧区域。' },
          { x: 53, y: 56, title: '液体影范围', text: '体位会影响液体分布。影像表现需结合立位片、超声及临床情况评估。' }
        ],
        xrayFeature: '立位胸片少量积液表现为外侧肋膈角变钝、变平；中大量积液呈外高内低的弧形弯月状致密影。',
        overview: '正常人胸膜腔内含有微量（约 5-15ml）起润滑作用的液体。当任何病理因素导致胸膜腔内液体形成过快或吸收过缓时，即产生胸腔积液。立位后前位胸片上，积液量达 250-300ml 时即可观察到肋膈角变钝。',
        causes: '分为渗出液与漏出液两大类。渗出性积液常见于肺炎旁胸腔积液、结核性胸膜炎、恶性肿瘤胸膜转移；漏出性积液多见于充血性心力衰竭、肝硬化低蛋白血症或肾病综合征。',
        symptoms: '积液量少时可无明显症状，或仅有胸膜摩擦引起的针刺样胸痛；积液量增多压迫肺组织时，会出现进行性加重的胸闷、气短、呼吸困难，患者常喜取患侧卧位。',
        prevention: '积极防治原发疾病（如肺部感染、肺结核与心肾慢性病）；一旦胸片提示肋膈角变钝或胸腔积液，应配合医生完成胸腔超声定位及必要的诊断性胸腔穿刺化验。'
      },
      {
        code: 'pneumothorax',
        name: '气胸 (Pneumothorax)',
        shortName: '气胸',
        severity: 'HIGH',
        severityLabel: '急症需立即就医',
        image: '/assets/knowledge/pneumothorax.jpg',
        imageAlt: '胸部X光示例：气胸可见胸膜线及外侧肺纹理减少',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:X-ray_of_pneumothorax_signs.jpg',
        hotspots: [
          { x: 63, y: 28, title: '胸膜线示意', text: '气胸片可见脏层胸膜线，线外侧肺纹理减少；此处为教学观察点。' },
          { x: 69, y: 50, title: '外侧透亮区', text: '留意胸壁与胸膜线之间的透亮区。突发胸痛或呼吸困难应立即就医。' }
        ],
        xrayFeature: '患侧肺组织向肺门方向压缩萎陷，可见清晰的脏层胸膜边缘（气胸线），外侧为无肺纹理的透亮区。',
        overview: '气体进入胸膜腔造成积气状态称为气胸。由于胸膜腔负压消失，患侧肺受压萎陷，严重时可将纵隔与心脏推向健侧（张力性气胸），属于需要紧急处理的呼吸系统急症。',
        causes: '原发性自发性气胸好发于体型瘦高的青年男性（多因肺尖部胸膜下肺大疱破裂引起）；继发性气胸常继发于慢性阻塞性肺疾病（COPD）、肺结核或胸部外伤。',
        symptoms: '常在剧烈运动、搬重物、剧烈咳嗽或屏气后突发一侧针刺样或刀割样胸痛，随后迅速出现胸闷、干咳和呼吸困难。',
        prevention: '有肺大疱或气胸病史者应避免剧烈对抗运动、举重、潜水及乘坐无增压舱航空器；保持大便通畅避免用力屏气；突发单侧胸痛伴气促时须立即就医拍片排查。'
      },
      {
        code: 'cardiomegaly',
        name: '心脏扩大 (Cardiomegaly)',
        shortName: '心脏扩大',
        severity: 'MEDIUM',
        severityLabel: '建议心内科评估',
        image: '/assets/knowledge/cardiomegaly.png',
        imageAlt: '心脏扩大示意图，展示肥厚型与扩张型心肌病心脏形态',
        imageType: '医学示意图（非胸片）',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Illustration_of_an_enlarged_heart_(Cardiomegaly).png',
        hotspots: [
          { x: 50, y: 44, title: '心脏轮廓', text: '图示用来认识心脏形态变化，不是胸部X光片，也不能据此判断心胸比。' },
          { x: 50, y: 67, title: '结构示意', text: '心脏大小需结合标准立位后前位胸片测量，并由医生结合心脏超声等检查评估。' }
        ],
        xrayFeature: '标准后前位胸片上心胸比率（心脏最大横径与胸廓最大横径之比）大于 0.50，心影呈靴形、梨形或普大型。',
        overview: '心脏扩大是指X光胸片上心脏轮廓横径异常增大（成人标准立位后前位片心胸比 > 0.50）。不同房室增大可呈现特征性心影形态，如左心室增大呈“主动脉型/靴形心”，左心房伴右心室增大呈“二尖瓣型/梨形心”。',
        causes: '常见于长期未受控的原发性高血压（高血压性心脏病）、冠状动脉粥样硬化性心脏病、心脏瓣膜病、扩张型心肌病以及心包积液等（注：仰卧前后位AP拍片或吸气不足也可能导致心影假性放大）。',
        symptoms: '早期代偿期可无症状；随心功能减退可出现活动后心悸、胸闷、气短、夜间阵发性呼吸困难或双下肢水肿。',
        prevention: '严格控制血压、血脂与血糖，低盐低脂饮食；若体检胸片提示心影增大，建议前往心血管内科完善心脏彩色多普勒超声（超声心动图）与心电图检查以明确心房心室结构。'
      },
      {
        code: 'atelectasis',
        name: '肺不张 (Atelectasis)',
        shortName: '肺不张',
        severity: 'MEDIUM',
        severityLabel: '需进一步CT排查',
        image: '/assets/knowledge/atelectasis.jpg',
        imageAlt: '胸部X光示例：右肺肺不张及肺容积缩小表现',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Atelectasia1.jpg',
        hotspots: [
          { x: 62, y: 54, title: '局部密度增高', text: '示例图展示肺不张的局部密度改变。还需留意病变区域体积是否缩小。' },
          { x: 48, y: 68, title: '容积变化', text: '肺叶、膈肌或纵隔的位置变化可帮助理解容积缩小，但需专业阅片确认。' }
        ],
        xrayFeature: '病变肺叶或肺段体积缩小、密度均匀增高，伴叶间裂向患侧移位、同侧膈肌抬高及纵隔牵拉移位。',
        overview: '肺不张是指一个或多个肺段、肺叶的含气量减少并伴随肺组织体积缩小（萎陷）。与肺炎渗出不同，肺不张的典型特征是“体积缩小与邻近结构向患侧代偿性牵拉”。',
        causes: '阻塞性肺不张最常见于支气管腔内黏液栓堵塞、异物吸入或支气管中心型肿瘤压迫；非阻塞性肺不张可见于大量胸腔积液或气胸的外压性萎陷，以及术后呼吸浅慢导致的盘状肺不张。',
        symptoms: '取决于发生速度与范围：缓慢发生的局灶性肺不张症状轻微；大叶性急性肺不张可引起胸闷、发绀、呼吸困难及干咳。',
        prevention: '胸部或上腹部手术后患者应尽早深呼吸、有效咳痰及翻身拍背；中老年人若胸片发现固定部位反复肺不张，务必完善胸部增强CT或支气管镜检查。'
      },
      {
        code: 'edema',
        name: '肺水肿 (Pulmonary Edema)',
        shortName: '肺水肿',
        severity: 'HIGH',
        severityLabel: '需急诊或专科干预',
        image: '/assets/knowledge/edema.jpg',
        imageAlt: '胸部X光示例：肺水肿可出现双肺弥漫性间质和肺泡影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Pulmonary_oedema.jpg',
        hotspots: [
          { x: 50, y: 47, title: '肺门周围阴影', text: '肺水肿可能出现肺门周围模糊影及双肺间质改变，示例表现并非特异征象。' },
          { x: 54, y: 60, title: '肺野分布', text: '观察双肺阴影分布及心影、胸腔情况。急性呼吸困难需立即就医。' }
        ],
        xrayFeature: '肺门阴影增大模糊，双肺内中带对称性云絮状阴影，典型者呈“蝶翼状”分布，伴小叶间隔增厚（Kerley B线）。',
        overview: '肺水肿是指血管内液体异常渗入肺间质和肺泡腔内，导致肺血管外液量异常增多。X光胸片可清晰反映从间质性肺水肿（Kerley A/B线、支气管袖口征）到肺泡性肺水肿（双肺门旁蝶翼征）的演变。',
        causes: '心源性肺水肿最常见于急性左心衰竭、急性心肌梗死或重度高血压危象；非心源性肺水肿可见于急性呼吸窘迫综合征（ARDS）、重症感染、高原反应或输液过快过量。',
        symptoms: '突发严重呼吸困难、端坐呼吸（不能平卧）、频繁咳嗽并咳出粉红色泡沫样痰，伴大汗淋漓与口唇发绀。',
        prevention: '心血管疾病患者需规律服药、避免感染与情绪剧烈波动，严格控制每日钠盐与液体摄入量；出现夜间不能平卧或喘息加重时须立即就医。'
      },
      {
        code: 'emphysema',
        name: '肺气肿 (Emphysema)',
        shortName: '肺气肿',
        severity: 'MEDIUM',
        severityLabel: '慢病呼吸管理',
        image: '/assets/knowledge/emphysema.jpg',
        imageAlt: '肺气肿胸部X光示例：可见肺大疱性改变',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Medical_X-Ray_imaging_WFH07_nevit.jpg',
        hotspots: [
          { x: 62, y: 39, title: '肺野透亮度', text: '肺气肿可能表现为肺野透亮度增高、肺纹理稀疏；需结合肺功能判断。' },
          { x: 51, y: 71, title: '膈肌形态', text: '膈肌低平和胸廓改变可作为观察线索，胸片不能替代肺功能检查。' }
        ],
        xrayFeature: '双肺野透亮度普遍增加，肺纹理稀疏变细，胸廓前后径增大呈桶状，肋间隙增宽，双侧膈肌低平。',
        overview: '肺气肿是指终末细支气管远端的气道弹性减退、过度膨胀、充气和肺容积增大，或同时伴有气道壁破坏的病理状态，是慢性阻塞性肺疾病（COPD）的核心影像学表现。',
        causes: '长期吸烟是最主要的致病因素；此外长期接触职业粉尘、生物燃料烟雾、空气污染、反复下呼吸道感染以及 α1-抗胰蛋白酶缺乏亦密切相关。',
        symptoms: '早期仅在爬楼或快步走时感到气短，随病程进展出现慢性咳嗽、咳白色黏液痰及日常活动后进行性呼吸困难。',
        prevention: '立即戒烟是延缓肺功能下降最有效的措施；建议完善肺功能检查（FEV1/FVC），坚持缩唇呼吸与腹式呼吸康复训练，规范使用支气管舒张剂。'
      },
      {
        code: 'fibrosis',
        name: '肺纤维化 (Fibrosis)',
        shortName: '肺纤维化',
        severity: 'MEDIUM',
        severityLabel: '建议专科随访',
        image: '/assets/knowledge/fibrosis.jpg',
        imageAlt: '特发性肺纤维化患者胸部影像示例',
        imageType: '胸部影像示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Radiological_evaluation_through_HRCT.jpg',
        hotspots: [
          { x: 55, y: 62, title: '网格状间质影', text: '纤维化可表现为网格状或条索状影；该示例来自特发性肺纤维化病例。' },
          { x: 43, y: 75, title: '双下肺区域', text: '常需结合高分辨率CT、肺功能及病史综合评估，胸片仅提供有限线索。' }
        ],
        xrayFeature: '局部或弥漫性网格状、条索状高密度影，严重者呈蜂窝状改变，常以双肺下野及胸膜下明显。',
        overview: '肺纤维化是肺间质组织受损后异常修复的结果，正常柔韧的肺泡间质被成纤维细胞与胶原蛋白替代。胸片上局限性纤维条索影多为陈旧性病灶，而双下肺弥漫性网格影则需警惕间质性肺疾病。',
        causes: '局灶性纤维索条常为既往肺炎或肺结核愈合后的“瘢痕”；弥漫性肺纤维化可与结缔组织病（如类风湿关节炎）、长期粉尘吸入（尘肺）、药物毒性或特发性肺纤维化（IPF）有关。',
        symptoms: '局灶性陈旧纤维灶无症状；弥漫性肺纤维化表现为进行性劳力性气促与持续性刺激性干咳。',
        prevention: '体检发现孤立性“少许纤维条索影”通常属于良性陈旧改变，定期年度复查即可；若伴随干咳与活动后气短，应完善高分辨率CT（HRCT）与肺弥散功能检测。'
      },
      {
        code: 'thickening',
        name: '胸膜增厚 (Pleural Thickening)',
        shortName: '胸膜增厚',
        severity: 'LOW',
        severityLabel: '多为良性陈旧改变',
        image: '/assets/knowledge/thickening.jpg',
        imageAlt: '胸部X光示例：结核后胸膜增厚',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Chest_x-ray_of_pleural_thickening_post-primary_tuberculosis.jpg',
        hotspots: [
          { x: 59, y: 70, title: '胸膜边缘', text: '胸膜增厚可在胸壁内侧形成带状或幕状影，需结合既往结核或胸膜炎病史。' },
          { x: 50, y: 56, title: '肋膈角', text: '观察肋膈角是否变钝以及胸膜牵拉情况，影像所见应由医生判断其意义。' }
        ],
        xrayFeature: '肋膈角轻度变钝或胸壁内侧可见带状、幕状高密度影，常伴胸膜粘连牵拉。',
        overview: '胸膜增厚是指在胸膜病变（如胸膜炎或胸腔积液）基础上，纤维蛋白沉着和肉芽组织增生导致的胸膜纤维化厚度增加。在体检胸片中极为常见，多数为局限性轻度增厚。',
        causes: '多由既往发生过的渗出性胸膜炎、肺部炎症波及胸膜、肺结核或胸部轻微外伤痊愈后遗留的胸膜反应性增生所致。',
        symptoms: '绝大多数局限性胸膜增厚粘连无明显临床症状，偶有深呼吸或天气变化时局部轻微牵拉感。',
        prevention: '轻度局限性胸膜增厚无需特殊药物或手术治疗，平时加强扩胸运动与深呼吸锻炼即可；若为广泛性胸膜增厚钙化影响呼吸功能，或短期内进行性增厚，则需专科就诊排查。'
      },
      {
        code: 'no_finding',
        name: '未见明显异常 (No Finding)',
        shortName: '未见异常',
        severity: 'LOW',
        severityLabel: '常规随访即可',
        image: '/assets/sample_3.jpg',
        imageAlt: '正常成人后前位胸部X光示例',
        imageType: '胸部X光示例（正常）',
        imageSource: '',
        hotspots: [
          { x: 50, y: 50, title: '双肺野透亮度', text: '正常胸片双肺野透亮度均匀，肺纹理自肺门向外周自然分支。' },
          { x: 48, y: 79, title: '肋膈角', text: '双侧肋膈角应锐利清晰；变钝时需结合临床排查积液或胸膜增厚。' }
        ],
        xrayFeature: '双肺野清晰、透亮度均匀，肺纹理走行自然，心影大小与纵隔形态正常，双侧肋膈角锐利。',
        overview: '“未见明显异常”是影像报告中的描述性结论，指本次胸片上未发现明确的活动性病变。它不等于全面健康评估，仍需结合症状、病史与其他检查综合判断。',
        causes: '正常胸片本身无病理病因；吸烟、职业粉尘暴露与既往肺部感染史仍可能增加未来影像异常的风险。',
        symptoms: '通常无咳嗽、胸痛、发热或呼吸困难等相关症状；若存在症状而胸片正常，仍需结合临床进一步检查。',
        prevention: '保持不吸烟、规律运动与疫苗接种；长期吸烟者或高危职业人群可按医生建议进行低剂量CT筛查，而不是仅依赖胸片。'
      },
      {
        code: 'infiltration',
        name: '肺浸润影 (Infiltration)',
        shortName: '浸润影',
        severity: 'HIGH',
        severityLabel: '建议结合临床评估',
        image: '/assets/knowledge/source-pneumonia.jpg',
        imageAlt: '胸部X光示例：肺野内斑片状浸润影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:X-ray_of_lobar_pneumonia.jpg',
        hotspots: [
          { x: 56, y: 64, title: '斑片状密度增高', text: '浸润影常表现为边缘模糊的斑片状密度增高，需结合发热、咳嗽等临床表现。' },
          { x: 46, y: 45, title: '分布与范围', text: '观察病变位于哪一肺叶/肺段、是否跨叶分布，以及是否伴支气管充气征。' }
        ],
        xrayFeature: '肺野内边缘模糊的斑片状、云絮状密度增高影，可单发或多发，常沿支气管血管束分布。',
        overview: '肺浸润影是影像学描述，指肺泡或肺间质内出现异常液体、炎性细胞或纤维组织，使局部肺组织密度升高。它既可见于感染，也可见于水肿、出血或肿瘤相关改变。',
        causes: '常见于细菌性或病毒性肺炎、吸入性损伤、肺水肿、肺出血及部分间质性肺病；需要结合病史、实验室检查与随访影像鉴别。',
        symptoms: '可有发热、咳嗽、咳痰、胸痛或气促；也可在体检中偶然发现而无明显症状。',
        prevention: '积极治疗呼吸道感染，吸烟者戒烟，老年人及慢性病患者按建议接种流感与肺炎球菌疫苗；出现持续发热或气促应及时就医。'
      },
      {
        code: 'mass',
        name: '肺部肿块 (Mass)',
        shortName: '肿块',
        severity: 'HIGH',
        severityLabel: '需尽快专科评估',
        image: '/assets/knowledge/nodule.jpg',
        imageAlt: '胸部X光示例：肺内局灶性团块影',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:Chest_X-ray_of_discrete_round_nodules_after_secondary_tuberculosis.jpg',
        hotspots: [
          { x: 60, y: 39, title: '团块状病灶', text: '直径大于 3cm 的局灶性密度增高影在影像上称为肿块，需与结节区分。' },
          { x: 41, y: 57, title: '边缘与伴随征象', text: '边缘分叶、毛刺或伴肺门增大时，应尽快完成胸部CT与专科评估。' }
        ],
        xrayFeature: '肺实质内直径 > 30mm 的局灶性密度增高影，边缘可光滑、分叶或毛刺，可伴空洞、钙化或胸膜牵拉。',
        overview: '肺部肿块是影像学形态描述，指直径大于3cm的局灶性病变。它可能是炎性假瘤、结核球等良性病变，也可能是原发性肺癌或转移瘤，必须进一步鉴别。',
        causes: '包括原发性支气管肺癌、肺转移瘤、炎性假瘤、结核球、错构瘤及部分真菌感染等。',
        symptoms: '早期可无症状；随病情进展可出现咳嗽、痰中带血、胸痛、气促、体重下降或反复肺部感染。',
        prevention: '戒烟并避免二手烟与职业粉尘暴露是最重要的预防措施；发现肿块应按医生建议尽快完成增强CT、必要时穿刺或支气管镜明确性质。'
      },
      {
        code: 'consolidation',
        name: '肺实变 (Consolidation)',
        shortName: '肺实变',
        severity: 'HIGH',
        severityLabel: '建议结合临床评估',
        image: '/assets/knowledge/source-pneumonia.jpg',
        imageAlt: '胸部X光示例：肺叶实变伴支气管充气征',
        imageType: '胸部X光示例',
        imageSource: 'https://commons.wikimedia.org/wiki/File:X-ray_of_lobar_pneumonia.jpg',
        hotspots: [
          { x: 58, y: 62, title: '实变区', text: '肺泡内气体被渗出物替代时，病变区呈均匀致密影，可累及整个肺叶。' },
          { x: 47, y: 47, title: '支气管充气征', text: '实变区内可见透亮的支气管影，是肺实质实变而非胸膜病变的重要线索。' }
        ],
        xrayFeature: '肺叶或肺段分布的均匀致密影，边界多受叶间裂限制，实变区内可见支气管充气征。',
        overview: '肺实变指肺泡腔内气体被液体、炎性渗出物或细胞成分替代，使受累肺组织呈均匀致密影。大叶性肺炎是最常见的典型原因，也可见于肺水肿、出血或肿瘤相关阻塞。',
        causes: '常见于细菌性肺炎、吸入性肺炎、肺水肿、肺出血及阻塞性肺不张；需结合发热、白细胞、痰培养与影像随访判断。',
        symptoms: '可有高热、寒战、咳嗽、脓痰、胸痛与呼吸困难；老年人可能仅表现为乏力或意识改变。',
        prevention: '及时治疗呼吸道感染、保持口腔卫生、避免误吸；高危人群接种疫苗，出现持续高热与气促应尽早就医。'
      }
    ];

    /** 后端模型实际输出的 10 个类别，用于“模型可识别”标识与结果页对照。 */
    const MODEL_CLASS_CODES = [
      'no_finding', 'atelectasis', 'cardiomegaly', 'effusion', 'infiltration',
      'mass', 'nodule', 'pneumonia', 'pneumothorax', 'consolidation'
    ];

    /**
     * 三、3 组临床典型示例病例数据 (包含模型热力坐标焦点与 10 类概率)
     */
    const CLINICAL_SAMPLE_CASES = {
      'case-high': {
        id: 'CASE-HIGH-0192',
        isDemo: true,
        fileName: 'PA_Chest_0192_Pneumonia.jpg',
        caseBadge: '样本1：右下肺斑片影 (高风险)',
        dimensions: '2048 × 2048 px',
        fileSize: 2977955,
        uploadedAt: '2026-10-17 20:50',
        imageUrl: SAMPLE_IMAGES.ABNORMAL,
        riskLevel: 'HIGH',
        summary: '右下肺野内中带可见局灶性斑片状高密度浸润影，肺炎（Pneumonia）倾向概率 78.4%，伴右侧肋膈角轻度变钝，建议结合血常规与胸部CT进一步门诊复查。',
        attentionRegion: '右下肺野内中带（第 7-9 后肋间，热力峰值 0.89）及右肺门下部、右肋膈角区域。',
        heatmapNote: '红色至橙色高激活区集中在右下肺野，提示该区域存在明显的肺泡渗出或实变特征，是模型判定高风险的核心区域。',
        hotspots: [
          { x: 0.37, y: 0.63, r: 0.21, weight: 0.95 },
          { x: 0.32, y: 0.72, r: 0.14, weight: 0.65 },
          { x: 0.43, y: 0.51, r: 0.12, weight: 0.48 }
        ],
        probabilities: [
          { code: 'pneumonia', name: '肺炎 (Pneumonia)', prob: 78.4 },
          { code: 'effusion', name: '胸腔积液 (Pleural Effusion)', prob: 34.2 },
          { code: 'atelectasis', name: '肺不张 (Atelectasis)', prob: 26.8 },
          { code: 'nodule', name: '肺结节 (Pulmonary Nodule)', prob: 18.5 },
          { code: 'cardiomegaly', name: '心脏扩大 (Cardiomegaly)', prob: 14.2 },
          { code: 'edema', name: '肺水肿 (Pulmonary Edema)', prob: 11.6 },
          { code: 'fibrosis', name: '肺纤维化 (Fibrosis)', prob: 9.3 },
          { code: 'emphysema', name: '肺气肿 (Emphysema)', prob: 7.5 },
          { code: 'thickening', name: '胸膜增厚 (Pleural Thickening)', prob: 6.1 },
          { code: 'pneumothorax', name: '气胸 (Pneumothorax)', prob: 3.2 }
        ]
      },
      'case-medium': {
        id: 'CASE-MED-0418',
        isDemo: true,
        fileName: 'PA_Chest_0418_Nodule.jpg',
        caseBadge: '样本2：右肺微小结节 (中风险)',
        dimensions: '2048 × 2048 px',
        fileSize: 2516582,
        uploadedAt: '2026-10-17 19:15',
        imageUrl: SAMPLE_IMAGES.ABNORMAL,
        riskLevel: 'MEDIUM',
        summary: '右肺中叶外带可见一处类圆形局灶性小结节影（肺结节倾向概率 46.5%），伴轻度胸膜增厚倾向，建议 3-6 个月内完善胸部低剂量薄层CT随访。',
        attentionRegion: '右肺中叶外侧带（第 5-6 后肋间，热力峰值 0.68）及右侧胸壁下缘。',
        heatmapNote: '橙黄色中度激活区聚焦于右肺中叶外带局灶结节区，其余肺野透亮度正常，未见大片渗出影。',
        hotspots: [
          { x: 0.31, y: 0.54, r: 0.13, weight: 0.82 },
          { x: 0.27, y: 0.74, r: 0.11, weight: 0.45 }
        ],
        probabilities: [
          { code: 'nodule', name: '肺结节 (Pulmonary Nodule)', prob: 46.5 },
          { code: 'thickening', name: '胸膜增厚 (Pleural Thickening)', prob: 31.4 },
          { code: 'fibrosis', name: '肺纤维化 (Fibrosis)', prob: 22.0 },
          { code: 'pneumonia', name: '肺炎 (Pneumonia)', prob: 15.8 },
          { code: 'atelectasis', name: '肺不张 (Atelectasis)', prob: 12.1 },
          { code: 'cardiomegaly', name: '心脏扩大 (Cardiomegaly)', prob: 9.4 },
          { code: 'emphysema', name: '肺气肿 (Emphysema)', prob: 8.2 },
          { code: 'effusion', name: '胸腔积液 (Pleural Effusion)', prob: 6.5 },
          { code: 'edema', name: '肺水肿 (Pulmonary Edema)', prob: 4.1 },
          { code: 'pneumothorax', name: '气胸 (Pneumothorax)', prob: 2.0 }
        ]
      },
      'case-low': {
        id: 'CASE-LOW-0801',
        isDemo: true,
        fileName: 'PA_Chest_0801_Normal.jpg',
        caseBadge: '样本3：标准正常胸片 (低风险)',
        dimensions: '2048 × 2048 px',
        fileSize: 2181038,
        uploadedAt: '2026-10-17 16:40',
        imageUrl: SAMPLE_IMAGES.NORMAL,
        riskLevel: 'LOW',
        summary: '双侧胸廓对称，双肺野清晰，肺纹理走向自然，心胸比率约 0.45 处于正常范围，双侧膈面光滑、肋膈角锐利，10 类胸部常见病变概率均处于低风险区间。',
        attentionRegion: '双肺野与心影轮廓整体分布均匀，无显著异常高权重局灶激活区。',
        heatmapNote: '全图仅在肺门生理血管交汇处呈微弱蓝绿色背景响应（峰值 < 0.22），符合正常成人后前位胸片影像特征。',
        hotspots: [
          { x: 0.44, y: 0.46, r: 0.14, weight: 0.25 },
          { x: 0.58, y: 0.48, r: 0.14, weight: 0.24 }
        ],
        probabilities: [
          { code: 'thickening', name: '胸膜增厚 (Pleural Thickening)', prob: 11.2 },
          { code: 'fibrosis', name: '肺纤维化 (Fibrosis)', prob: 8.4 },
          { code: 'nodule', name: '肺结节 (Pulmonary Nodule)', prob: 7.6 },
          { code: 'cardiomegaly', name: '心脏扩大 (Cardiomegaly)', prob: 6.8 },
          { code: 'emphysema', name: '肺气肿 (Emphysema)', prob: 5.5 },
          { code: 'pneumonia', name: '肺炎 (Pneumonia)', prob: 4.9 },
          { code: 'atelectasis', name: '肺不张 (Atelectasis)', prob: 3.8 },
          { code: 'effusion', name: '胸腔积液 (Pleural Effusion)', prob: 2.9 },
          { code: 'edema', name: '肺水肿 (Pulmonary Edema)', prob: 2.1 },
          { code: 'pneumothorax', name: '气胸 (Pneumothorax)', prob: 1.4 }
        ]
      }
    };

    /**
     * 四、影像小课堂：交互式解剖标注热区数据、常见征象与九步读片法数据
     */
    const ANATOMY_HOTSPOTS = [
      {
        id: 1,
        name: '气管与主支气管分叉 (Trachea & Carina)',
        x: 50,
        y: 22,
        normal: '位于颈胸段正中线，表现为垂直带状透亮影，向下在第 4-5 胸椎水平分叉为左、右主支气管。',
        abnormal: '若气管明显向一侧移位，需警惕肺不张/胸膜粘连（向患侧牵拉）或大量胸腔积液/气胸（向健侧推压）。',
        tip: '读片第一步先看气管是否居中，可快速判断纵隔有无移位及投照体位是否端正。'
      },
      {
        id: 2,
        name: '右上肺野与肺尖 (Right Upper Lung Field)',
        x: 34,
        y: 28,
        normal: '含气量丰富，透亮度均匀，肺纹理自肺门向外上方呈树枝状自然变细，外带基本无明显粗大纹理。',
        abnormal: '成人继发性肺结核好发于上叶尖后段，常表现为斑片、结节及纤维钙化灶；肺尖部也是自发性气胸最先出现气胸线的位置。',
        tip: '注意锁骨上下区左右对比，排查被第一肋骨和锁骨重叠掩盖的小结节。'
      },
      {
        id: 3,
        name: '双侧肺门结构 (Pulmonary Hilum)',
        x: 41,
        y: 45,
        normal: '由肺动脉、肺静脉、主支气管及淋巴组织共同构成。正常左肺门比右肺门高 1~2 cm，轮廓清晰。',
        abnormal: '肺门影增大、饱满或结构模糊，可见于肺门淋巴结肿大、中央型肺部占位或肺水肿/肺动脉高压。',
        tip: '牢记“左高右低”生理规律，若右肺门高于左肺门则往往提示右上肺叶不张牵拉。'
      },
      {
        id: 4,
        name: '主动脉结 (Aortic Knob)',
        x: 55,
        y: 34,
        normal: '位于左纵隔上部、肺动脉段上方，是主动脉弓由前向后转折处在正位片上的投影，呈平滑半圆形突起。',
        abnormal: '中老年人主动脉粥样硬化或长期高血压时，主动脉结明显向左上迂曲突出，有时伴弧形钙化影。',
        tip: '主动脉结下方与左心室之间的小凹陷称为“心腰（肺动脉段）”，是判断心影形态的重要标志。'
      },
      {
        id: 5,
        name: '心脏轮廓与心胸比 (Cardiac Silhouette)',
        x: 57,
        y: 58,
        normal: '约 2/3 位于正中线左侧，1/3 位于右侧。成人标准立位后前位胸片上，心胸比率（心影最大横径/胸廓最大内径）≤ 0.50。',
        abnormal: '心胸比率 > 0.50 提示心脏扩大（如左室肥大呈靴形心、二尖瓣病变呈梨形心、心包积液呈烧瓶心）。',
        tip: '测量心胸比时必须确认是立位后前位（PA）且深吸气末拍片，呼气相会导致心影假性偏大。'
      },
      {
        id: 6,
        name: '右下肺野 (Right Lower Lung Field)',
        x: 34,
        y: 62,
        normal: '由于右侧主支气管较粗短且陡直，右下肺血供丰富，正常肺纹理比上肺野略粗，但走向自然清晰。',
        abnormal: '社区获得性肺炎、吸入性肺炎及支气管扩张最常累及右下肺野，表现为边缘模糊的斑片状浸润影。',
        tip: '本系统样本1的模型热力高亮区即位于右下肺野内中带。'
      },
      {
        id: 7,
        name: '右侧膈肌顶与左侧胃泡 (Diaphragm & Gastric Bubble)',
        x: 35,
        y: 76,
        normal: '膈肌呈平滑向上隆起的圆顶状，受肝脏支撑影响，正常右侧膈顶比左侧高 1~2 cm；左膈下常见含气胃泡影。',
        abnormal: '膈肌低平见于肺气肿；单侧膈肌异常升高见于肺叶不张、膈下脓肿或膈神经麻痹；膈下新月形游离气体提示消化道穿孔。',
        tip: '观察膈面是否光滑清晰，若膈面模糊不清常提示邻近下叶肺炎或胸膜粘连。'
      },
      {
        id: 8,
        name: '双侧外侧肋膈角 (Costophrenic Angles)',
        x: 19,
        y: 80,
        normal: '由胸壁外侧缘与膈肌向下倾斜汇合形成的锐利夹角，正常极为深邃锐利。',
        abnormal: '当胸膜腔内积液量达到 250~300ml 时，液体首先积聚于最低处的肋膈窦，导致肋膈角变钝、变平或消失。',
        tip: '阅片收尾必查双侧肋膈角是否如刀锋般锐利，这是排查胸腔积液和胸膜增厚最敏感的窗口。'
      }
    ];

    const ACADEMY_SIGNS = [
      {
        code: 'pneumonia',
        title: '斑片状浸润影 (Patchy Infiltration)',
        tag: '肺炎典型征象',
        risk: 'HIGH',
        desc: '肺泡腔内被炎性渗出液填充，X光表现为边缘模糊的云絮状或斑片状高密度影，病变区隐约可见透亮的支气管影（支气管充气征）。',
        clinical: '常见于细菌性肺炎、支原体肺炎等急性下呼吸道感染，抗感染治疗后2-4周复查可明显吸收消散。'
      },
      {
        code: 'nodule',
        title: '孤立性肺结节影 (Solitary Pulmonary Nodule)',
        tag: '体检重点关注',
        risk: 'MEDIUM',
        desc: '肺实质内直径 ≤ 3cm 的类圆形局灶致密影。良性结节多边界光滑或伴中心钙化；恶性倾向结节常呈分叶状、短毛刺征或胸膜凹陷征。',
        clinical: '胸片检出结节后，临床金标准是进一步行胸部低剂量薄层螺旋CT（LDCT）明确结节密度（实性/磨玻璃）与微细边缘。'
      },
      {
        code: 'effusion',
        title: '肋膈角变钝与外高内低弧线 (Meniscus Sign)',
        tag: '胸腔积液征象',
        risk: 'HIGH',
        desc: '少量游离胸腔积液首先填平外侧肋膈角使其变钝；中等量积液在毛细管吸附与肺弹性回缩共同作用下，形成典型的外高内低弯月形致密影。',
        clinical: '若肋膈角轻度变钝且随体位无变化，多为陈旧性胸膜增厚粘连；若伴随气短或发热则提示活动性胸腔积液。'
      },
      {
        code: 'pneumothorax',
        title: '气胸线与外侧无肺纹理区 (Visceral Pleural Line)',
        tag: '急症识别要点',
        risk: 'HIGH',
        desc: '空气进入胸膜腔将肺组织向肺门压缩，萎陷肺的边缘形成一条纤细清晰的致密线（气胸线），线外侧为完全没有肺纹理的均匀高透亮区。',
        clinical: '瘦高体型青年突发单侧胸痛时需重点观察肺尖部有无细小气胸线。'
      },
      {
        code: 'cardiomegaly',
        title: '心胸比率 > 0.50 (Increased Cardiothoracic Ratio)',
        tag: '心脏扩大评估',
        risk: 'MEDIUM',
        desc: '在深吸气立位后前位片上，心脏左右最大横径之和除以胸廓最大内径大于 0.50。左室肥大心尖向左下延伸呈靴形，双房增大呈梨形。',
        clinical: '需排除呼气相拍片或仰卧前后位（AP）拍片造成的放大效应，建议结合超声心动图评估射血分数与瓣膜状态。'
      },
      {
        code: 'emphysema',
        title: '肺透亮度增高与桶状胸 (Hyperlucency & Barrel Chest)',
        tag: '肺气肿典型征象',
        risk: 'MEDIUM',
        desc: '双肺野整体变黑（透亮度增加），外周肺纹理稀疏变细，肋骨走向趋于水平、肋间隙增宽，双侧膈肌明显下移变平。',
        clinical: '提示肺泡过度充气与慢性气流受限，常见于长期吸烟者与慢阻肺（COPD）患者。'
      }
    ];

    const NINE_STEPS_GUIDE = [
      { step: '第 1 步', title: '核对基本信息與标志', desc: '确认片头L/R方位标识、受检者信息与拍片日期，避免左右镜像误判（如右位心漏诊）。' },
      { step: '第 2 步', title: '评估投照质量与体位', desc: '双侧锁骨内端与胸椎棘突距离相等代表体位端正；平静吸气末右膈顶应位于第6前肋或第10后肋水平。' },
      { step: '第 3 步', title: '扫视胸廓软组织与骨骼', desc: '沿双侧锁骨、肩胛骨、12对肋骨及胸椎逐一追踪，排查肋骨骨折、骨质破坏或胸壁畸形。' },
      { step: '第 4 步', title: '观察气管与上纵隔', desc: '确认气管透亮带是否严格居中，上纵隔宽度是否正常，主动脉结有无迂曲钙化。' },
      { step: '第 5 步', title: '测量心影形态与心胸比', desc: '观察心脏左缘（主动脉结、肺动脉段、左心室）与右缘弧度，核算心胸比率是否 ≤ 0.50。' },
      { step: '第 6 步', title: '检查双侧膈肌轮廓', desc: '对比右高左低的生理高度差（1-2cm），确认膈面是否光滑清晰，左膈下胃泡是否正常。' },
      { step: '第 7 步', title: '审视双侧外侧肋膈角', desc: '重点查看左右两侧肋膈角是否深邃锐利，有无变钝、平直或弯月状液体致密影。' },
      { step: '第 8 步', title: '双侧肺野分区对称比较', desc: '将肺野分为上、中、下三野及内、中、外三带，从肺尖向肺底左右对称横向扫视，寻找斑片或结节影。' },
      { step: '第 9 步', title: '复核双侧肺门与盲区', desc: '最后复查左高右低的肺门血管结构，并重点复核肺尖、心影后方、膈顶后方三大易漏诊盲区。' }
    ];

    const ACADEMY_QUIZ_LIST = [
      {
        id: 'q1',
        question: '1. 在标准成人立位后前位（PA）胸部X光片上，判断“心脏扩大”的常规心胸比率阈值是多少？',
        options: ['A. 大于 0.35', 'B. 大于 0.50', 'C. 大于 0.65', 'D. 大于 0.80'],
        answerIndex: 1,
        explanation: '正确！成人立位后前位深吸气胸片上，正常心胸比率 ≤ 0.50；超过 0.50 提示心影增大（轻度 0.51-0.55，中度 0.56-0.60，重度 >0.60）。'
      },
      {
        id: 'q2',
        question: '2. 当立位胸片发现“右侧外侧肋膈角变钝、消失”，最常见且需优先排查的征象是什么？',
        options: ['A. 胸腔积液或胸膜增厚粘连', 'B. 右上肺大叶性肺不张', 'C. 气胸', 'D. 小叶中心型肺气肿'],
        answerIndex: 0,
        explanation: '正确！肋膈角是立位胸膜腔的最低点，游离液体达 250-300ml 时首先填平肋膈角使其变钝；陈旧性胸膜增厚粘连也可呈类似表现。'
      },
      {
        id: 'q3',
        question: '3. 关于本系统模型可解释热力图的颜色含义，下列哪项理解最为准确？',
        options: [
          'A. 红色区域代表肺部温度升高',
          'B. 蓝色区域代表病变最严重的位置',
          'C. 红色至橙色高激活区代表AI模型判定异常征象时关注权重最高的解剖区域',
          'D. 热力图可直接作为临床确诊依据'
        ],
        answerIndex: 2,
        explanation: '正确！模型注意力热力图把模型最关注的区域以红/橙暖色高亮呈现，帮助理解 AI 推理依据；它不是临床病灶定位。'
      },
      {
        id: 'q4',
        question: '4. 气胸在立位胸片上的典型征象是什么？',
        options: ['A. 肋膈角变钝', 'B. 胸膜线及其外侧无肺纹理的透亮区', 'C. 心影普遍增大', 'D. 双肺弥漫性透亮度减低'],
        answerIndex: 1,
        explanation: '正确！脏层胸膜线是气胸的关键征象，线外侧为无肺纹理的透亮区；少量气胸容易在肺尖部漏诊。'
      },
      {
        id: 'q5',
        question: '5. 胸片发现 6 mm 的孤立性肺结节，下一步最合理的处理是？',
        options: ['A. 立即手术切除', 'B. 直接忽略', 'C. 低剂量薄层 CT 进一步评估并按风险随访', 'D. 只复查胸片即可'],
        answerIndex: 2,
        explanation: '正确！胸片对 8-10 mm 以下结节不敏感，发现结节后通常需低剂量薄层 CT 评估密度、边缘与随访计划。'
      },
      {
        id: 'q6',
        question: '6. 把热力图透明度调到 0%，最准确的理解是？',
        options: ['A. 关闭热力图层，只显示原始影像', 'B. 删除了病灶', 'C. 提高了模型概率', 'D. 改变了模型判断'],
        answerIndex: 0,
        explanation: '正确！透明度只影响显示，不改变模型输出；热力图用于理解模型关注区域，不能作为诊断依据。'
      }
    ];

    /**
     * 五、全局应用状态中心 (模拟 Pinia Store: useDiagnoseStore + useUserStore)
     */
    const INITIAL_APP_STATE = {
      familyMembers: [],
      currentMemberId: null,
      currentPage: 'home',
      currentSampleKey: 'case-high',
      diagnoseStatus: 'idle', // 'idle' | 'analyzing' | 'done'
      diagnosisError: '',
      currentCase: JSON.parse(JSON.stringify(CLINICAL_SAMPLE_CASES['case-high'])),
      series: [],
      seriesIndex: 0,
      viewer: {
        scale: 1.0,
        rotation: 0,
        tx: 0,
        ty: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        invertFilter: false,
        brightness: VIEWER_DEFAULTS.brightness,
        contrast: VIEWER_DEFAULTS.contrast,
        measureMode: 'none',
        measurePoints: [],
        measurements: [],
        pixelSpacing: null,
        showHeatmap: true,
        heatmapOpacity: VIEWER_DEFAULTS.heatmapOpacity,
        compareMode: false,
        splitPercent: VIEWER_DEFAULTS.splitPercent
      },
      probViewMode: 'list', // 'list' | 'chart'
      selectedDiseaseCode: 'pneumonia',
      selectedAnatomySpotId: 6,
      agentResult: null,
      quizAnswered: {},
      pendingDeleteRecordId: null,
      userProfile: {
        name: '林知夏',
        ageGroup: '青年 (18-35岁)',
        age: '',
        gender: '未填写',
        conditions: '',
        notes: ''
      },
      records: [
        {
          id: 'REC-20261017-01',
          isDemo: true,
          title: 'PA_Chest_0192_Pneumonia.jpg',
          createdAt: '2026-10-17 14:20',
          daysAgo: 0,
          riskLevel: 'HIGH',
          imageUrl: SAMPLE_IMAGES.ABNORMAL,
          summary: '右下肺野内中带可见局灶性斑片状高密度浸润影，肺炎（Pneumonia）倾向概率 78.4%，建议结合血常规与胸部CT进一步门诊复查。',
          attentionRegion: '右下肺野内中带（第 7-9 后肋间，热力峰值 0.89）及右肺门下部区域。',
          probabilities: JSON.parse(JSON.stringify(CLINICAL_SAMPLE_CASES['case-high'].probabilities))
        },
        {
          id: 'REC-20261011-02',
          isDemo: true,
          title: 'PA_Chest_0418_Nodule_Followup.jpg',
          createdAt: '2026-10-11 10:15',
          daysAgo: 6,
          riskLevel: 'MEDIUM',
          imageUrl: SAMPLE_IMAGES.ABNORMAL,
          summary: '右肺中叶外带可见类圆形局灶小结节影（肺结节倾向概率 46.5%），伴轻度胸膜增厚，建议 3-6 个月低剂量螺旋CT随访。',
          attentionRegion: '右肺中叶外侧带（第 5-6 后肋间，热力峰值 0.68）。',
          probabilities: JSON.parse(JSON.stringify(CLINICAL_SAMPLE_CASES['case-medium'].probabilities))
        },
        {
          id: 'REC-20260922-03',
          isDemo: true,
          title: 'Annual_Checkup_PA_Normal.jpg',
          createdAt: '2026-09-22 09:30',
          daysAgo: 25,
          riskLevel: 'LOW',
          imageUrl: SAMPLE_IMAGES.NORMAL,
          summary: '双侧胸廓对称，双肺野清晰，肺纹理走向自然，心胸比率 0.45 正常，双侧肋膈角锐利，未见明显活动性实质病变。',
          attentionRegion: '双肺野及心影轮廓整体分布均匀，无异常高激活热区。',
          probabilities: JSON.parse(JSON.stringify(CLINICAL_SAMPLE_CASES['case-low'].probabilities))
        }
      ]
    };


export {
  MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES, VIEWER_ZOOM, PROB_THRESHOLD, SAMPLE_IMAGES,
  DISEASE_KNOWLEDGE_LIST, MODEL_CLASS_CODES, CLINICAL_SAMPLE_CASES, ANATOMY_HOTSPOTS, ACADEMY_SIGNS,
  NINE_STEPS_GUIDE, ACADEMY_QUIZ_LIST, INITIAL_APP_STATE
};
