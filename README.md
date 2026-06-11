# BAAC CBS Collateral Test Data Generator

เครื่องมือสำหรับสร้าง Payload ทดสอบระบบ CBS ครอบคลุมหลักประกันทุกประเภท พร้อม workflow อัตโนมัติผ่าน Postman Collection Runner

---

## ไฟล์ในโปรเจกต์

| ไฟล์ | คำอธิบาย |
|---|---|
| `Generate_Json_Collateralv2.html` | HTML Generator สำหรับสร้าง payload ทีละรายการ (เปิดบน banking computer) |
| `generate-test-data.js` | Script สำหรับสร้าง payload จาก Planning CSV ทีเดียว 246 รายการ |
| `postman-data.json` | Postman iteration data ที่พร้อม import (output จาก script) |
| `tracking-sheet.csv` | ตารางสำหรับส่งหัวหน้า (CIF, coll_id, aprs_value, contract_date) |

---

## CSV Template — โครงสร้างไฟล์ที่ script ต้องการ

### Columns ที่จำเป็น (ตำแหน่งต้องตรง)

| Col # | ชื่อ Column | จำเป็น | รูปแบบ | ตัวอย่าง |
|---|---|---|---|---|
| 0 | `Seq.` | ✅ | ตัวเลขลำดับ | `1`, `2`, `3` |
| 4 | `Customer Type (ผู้กู้)` | ✅ | `(CODE) ชื่อประเภท` | `(603) เกษตรกร` |
| 5 | `Grade` | ✅ | B / A / AA / AAA / AAA+ หรือ `(random)` | `B` |
| 6 | `CIF` | ⬜ | ตัวเลข CIF (ถ้ามีอยู่แล้ว) | `29452` |
| 7 | `ID-COLL` | ⬜ | ตัวเลข coll_id (ถ้ามีอยู่แล้ว) | `18243` |
| 8 | `TYPE-COLL` | ✅ | `N - ชื่อประเภท` | `1 - ที่ดิน` |
| 9 | `รหัสหลักประกันฯ (BOT)` | ✅ | `รหัส - คำอธิบาย` | `286003 - ที่ดิน` |
| 12 | `ราคาประเมินรวม` | ⬜ | ตัวเลข (ว่างไว้ = สุ่มอัตโนมัติ) | `500,000.00` |
| 14 | `AccType` | ⬜ | สำหรับ Type 5 bond เท่านั้น | `(1) ผู้กู้ 0-4 ปี` |
| 16 | `วันหมดอายุสัญญาเงินกู้` | ⬜ | `DD/MM/YYYY` พ.ศ. | `14/12/2572` |

> ✅ = ต้องกรอก / ⬜ = optional (ว่างไว้ script จะสุ่มให้)

---

### ค่าที่รองรับในแต่ละ Column

**Col 4 — Customer Type**
| Code | ชื่อ | API ที่ใช้ |
|---|---|---|
| `(603)` | เกษตรกร | Personal |
| `(600)` | บุคคลธรรมดา | Personal |
| `(500)` | นิติบุคคล | Corporate |
| `(707)` | สหกรณ์การเกษตร | Corporate |
| `(704)` | สหกรณ์ร้านค้า | Corporate |
| `(709)` | กลุ่มเกษตรกร | Corporate |
| `(710)` | กองทุนหมู่บ้าน | Corporate |

**Col 8 — TYPE-COLL**
| ค่า | ความหมาย |
|---|---|
| `1 - ที่ดิน` | Type 1 |
| `2 - สิ่งปลูกสร้าง` | Type 2 |
| `3 - เครื่องจักร` | Type 3 |
| `4 - บัญชีเงินฝาก` | **ถูก skip อัตโนมัติ** |
| `5 - พันธบัตร` | Type 5 |
| `8 - คอนโด/อาคารชุด` | Type 8 |
| `13 - หนังสือค้ำประกัน` | Type 13 |
| `14 - สลาก` | Type 14 |
| `17 - อสังหาริมทรัพย์อื่นๆ` | Type 17 |
| `99 - อื่นๆ` | Type 99 |

**Col 9 — BOT Code (ตัวอย่างที่สำคัญ)**
| รหัส | ความหมาย |
|---|---|
| `286003 - ที่ดิน` | ที่ดินเปล่า |
| `286006 - ที่ดินพร้อมสิ่งปลูกสร้าง` | ที่ดิน + สิ่งปลูกสร้าง |
| `286004 - อาคารพร้อมสิ่งปลูกสร้าง` | อาคาร |
| `286006 - อื่นๆ (ไม้ยืนต้น)` | ไม้ยืนต้น (build_type=9) |
| `286011 - เครื่องจักร (0)` | มีเลขทะเบียน |
| `286011 - เครื่องจักร (1)` | ไม่มีเลขทะเบียน |
| `286011 - เครื่องจักร (2)` | ใบสั่งซื้อ |
| `286018 - พันธบัตร` | Type 5 |
| `286061 (1) - บสย.` | LG subtype 1 |
| `286061 (2) - บสย. รัฐ` | LG subtype 2 |
| `286061 (3) - กองทุนบำเหน็ดตกทอด` | LG subtype 3 |
| `286061 (4) - หนังสือประกันกระทรวงฯ` | LG subtype 4 |
| `286023 - สลาก` | Type 14 |
| `286008 (5) - โฉนดสปก.` | Type 17, land_doc_subtype=5 |
| `286039 - เรือประมง` | Type 99 เรือ |
| `286214 (1) - สินค้าคงคลัง ข้าว` | Type 99 ข้าว |
| `286214 (3) - สินค้าคงคลัง ข้าวโพด` | Type 99 ข้าวโพด |

**Col 14 — AccType (สำหรับ Type 5 เท่านั้น)**
| ค่า | ความหมาย |
|---|---|
| `(1) ผู้กู้ 0-4 ปี` | bond expire 0-4 ปี |
| `(1) ผู้กู้ 4-8 ปี` | bond expire 4-8 ปี |
| `(1) ผู้กู้ 8-12 ปี` | bond expire 8-12 ปี |
| `(1) ผู้กู้ 12-16 ปี` | bond expire 12-16 ปี |
| `(1) ผู้กู้ >16 ปี` | bond expire 16-30 ปี |

---

### ตัวอย่าง CSV (แต่ละ collateral type)

```
Seq.,Create Datatest Date,ID-Branch,Branch,Customer Type (ผู้กู้),Grade,CIF,ID-COLL,TYPE-COLL,รหัสหลักประกันธนาคารแห่งประเทศไทย,ContractNo,หมดอายุสัญญา,ราคาประเมินรวม ,DepAcc ,AccType,Conditions,วันหมดอายุสัญญาเงินกู้,สาขา/หน่วย,กลุ่ม,สถานะบัญชี,Used,หมายเหตุ
1,27/5/2026,611,สาขาแม่สูน,(603) เกษตรกร,B,29452,18243,1 - ที่ดิน,286003 - ที่ดิน,,,500000.00,,,,14/12/2572,611,611,,,
2,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,1 - ที่ดิน,286006 -ที่ดินพร้อมสิ่งปลูกสร้าง,,,,,,,,611,611,,,
3,,611,สาขาแม่สูน,(600) บุคคลธรรมดา,(random),,,2 - สิ่งปลูกสร้าง,286004 - อาคารพร้อมสิ่งปลูกสร้าง,,,,,,,,611,611,,,
4,,611,สาขาแม่สูน,(500) นิติบุคคล,(random),,,2 - สิ่งปลูกสร้าง,286006 - อื่นๆ (ไม้ยืนต้น),,,,,,,,611,611,,,
5,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,3 - เครื่องจักร,286011 - เครื่องจักร (0),,,,,,,,611,611,,,
6,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,5 - พันธบัตร,286018 - พันธบัตร,,,,,,(1) ผู้กู้ 0-4 ปี,,611,611,,,
7,,611,สาขาแม่สูน,(707) สหกรณ์การเกษตร,(random),,,8 - คอนโด/อาคารชุด,286008 - อาคารชุด,,,,,,,,611,611,,,
8,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,13 - หนังสือค้ำประกัน,286061 (1) - บสย.,,,,,,,,611,611,,,
9,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,14 - สลาก,286023 - สลาก,,,,,,,,611,611,,,
10,,611,สาขาแม่สูน,(603) เกษตรกร,B,,,17 - อสังหาริมทรัพย์อื่นๆ,286008 (5) - โฉนดสปก.,,,,,,,,611,611,,,
11,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,99 - อื่นๆ ,286039  - เรือประมง,,,,,,,,611,611,,,
12,,611,สาขาแม่สูน,(603) เกษตรกร,(random),,,99 - อื่นๆ ,286214 (3) - สินค้าคงคลัง ข้าวโพด,,,,,,,,611,611,,,
```

> **หมายเหตุ:** Col 6 (CIF) และ Col 7 (ID-COLL) เว้นว่างไว้ได้ หมายความว่าเป็น customer ใหม่ที่ยังไม่มีในระบบ script จะสร้าง payload สำหรับ create ให้อัตโนมัติ

---

## ข้อกำหนดเบื้องต้น

- **Node.js** v14+ (สำหรับรัน generate-test-data.js บน Mac)
- **Postman** (web.postman.co หรือ Desktop)
- ไฟล์ Planning CSV ที่มี structure ตาม template ด้านบน

---

## ขั้นตอนการใช้งาน

### Step 1 — สร้าง Payload จาก Planning CSV

แก้ path CSV ใน `generate-test-data.js` บรรทัดที่ 15:
```javascript
const PLANNING_CSV = '/path/to/your/planning.csv';
```

แล้วรัน:
```bash
node generate-test-data.js
```

**Output ที่ได้:**
- `postman-data.json` — test cases ทั้งหมด พร้อมใช้
- `tracking-sheet.csv` — ตารางสำหรับส่งหัวหน้า

> ⚠️ **หมายเหตุ:** หลักประกันประเภท 4 (บัญชีเงินฝาก) จะถูก Skip อัตโนมัติ เนื่องจากต้องใช้เลขบัญชีจริงจากระบบธนาคาร

---

### Step 2 — โครงสร้าง Postman Collection

Collection มี **7 requests** แต่เราใช้แค่ **5 requests** (skip 4-updateCustomerRegistration และ 5-updatePersonalCustomer):

```
📁 CreateDataCBS
  ├── 1-createPersonalCustomer       POST  .../v1/customers/personal/create
  ├── 2-createCorporateCustomer      POST  .../v1/customers/corporate/create
  ├── 3-createCustomerRegistration   POST  .../v1/customers/registration/create
  ├── 4-updateCustomerRegistration   ← SKIP (ไม่ใช้ในขั้นตอนนี้)
  ├── 5-updatePersonalCustomer       ← SKIP (ไม่ใช้ในขั้นตอนนี้)
  ├── 6-createCollateral คำอธิบาย   POST  .../v1/collaterals/create
  └── 7-createCollateralOwner        POST  .../v1/collaterals/customers/create
```

**Flow ต่อ 1 iteration:**
- **Personal** (603, 600): รัน 1 → skip 2 → รัน 3 → skip 4,5 → รัน 6 → รัน 7
- **Corporate** (500, 707, 709 ฯลฯ): skip 1 → รัน 2 → รัน 3 → skip 4,5 → รัน 6 → รัน 7

> `postman.setNextRequest()` จะทำการ skip request ที่ไม่ต้องการอัตโนมัติ

ตั้งค่า Environment variable:
- `base_url` = base URL ของ banking server (เช่น `https://soagwuat.kube.baac.or.th:8543/LPSWS-cbsiuat/service`)

---

### Step 3 — ใส่ Scripts ใน Postman

คัดลอก script ด้านล่างใส่ใน **Pre-request Script** และ **Post-request Script (Tests tab)** ของแต่ละ request:

---

#### Request 1: `1-createPersonalCustomer`

**Pre-request Script:**
```javascript
// ถ้าเป็น corporate ให้ข้ามไป request 2 เลย
if (pm.iterationData.get("customer_api_type") !== "personal") {
    postman.setNextRequest("2-createCorporateCustomer");
    return;
}
const body = JSON.parse(pm.iterationData.get("create_customer_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Post-request Script (Tests tab):**
```javascript
if (pm.iterationData.get("customer_api_type") !== "personal") return;
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const cif = res?.data?.customer_id || res?.customerId || res?.cif || "";
pm.environment.set("current_cif", cif);
pm.test("Personal Customer created", () => pm.expect(cif).to.not.be.empty);
```

---

#### Request 2: `2-createCorporateCustomer`

**Pre-request Script:**
```javascript
// ถ้าเป็น personal ให้ข้ามไป request 3 เลย
if (pm.iterationData.get("customer_api_type") !== "corporate") {
    postman.setNextRequest("3-createCustomerRegistration");
    return;
}
const body = JSON.parse(pm.iterationData.get("create_customer_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Post-request Script (Tests tab):**
```javascript
if (pm.iterationData.get("customer_api_type") !== "corporate") return;
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const cif = res?.data?.customer_id || res?.customerId || res?.cif || "";
pm.environment.set("current_cif", cif);
pm.test("Corporate Customer created", () => pm.expect(cif).to.not.be.empty);
```

---

#### Request 3: `3-createCustomerRegistration`

**Pre-request Script:**
```javascript
let body = JSON.parse(pm.iterationData.get("create_registration_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Post-request Script (Tests tab):**
```javascript
pm.test("Registration created", () => pm.response.to.have.status(200));
// ข้าม 4-updateCustomerRegistration และ 5-updatePersonalCustomer
postman.setNextRequest("6-createCollateral คำอธิบาย");
```

---

#### Request 6: `6-createCollateral คำอธิบาย`

**Pre-request Script:**
```javascript
const body = JSON.parse(pm.iterationData.get("create_collateral_body"));
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Post-request Script (Tests tab):**
```javascript
const res = pm.response.json();
// ⚠️ ปรับ path ให้ตรงกับ response จริงของ API
const collId = res?.data?.coll_id || res?.collId || res?.id || "";
pm.environment.set("current_coll_id", collId);
pm.test("Collateral created", () => pm.expect(collId).to.not.be.empty);
```

---

#### Request 7: `7-createCollateralOwner`

**Pre-request Script:**
```javascript
let body = JSON.parse(pm.iterationData.get("create_owner_body"));
body.rqBody.customer_id = pm.environment.get("current_cif");
body.rqBody.coll_id     = pm.environment.get("current_coll_id");
pm.request.body.update({ mode: "raw", raw: JSON.stringify(body) });
```

**Post-request Script (Tests tab):**
```javascript
const cif      = pm.environment.get("current_cif");
const collId   = pm.environment.get("current_coll_id");
const aprs     = pm.iterationData.get("planned_aprs_value");
const contract = pm.iterationData.get("planned_contract_date");
const seq      = pm.iterationData.get("seq");

// เก็บผลลัพธ์ทุก iteration ไว้ใน environment variable
let results = JSON.parse(pm.environment.get("run_results") || "[]");
results.push({ seq, cif, coll_id: collId, aprs_value: aprs, contract_date: contract });
pm.environment.set("run_results", JSON.stringify(results));

pm.test("Owner created", () => pm.response.to.have.status(200));
```

---

### Step 4 — รัน Collection Runner

1. เปิด **Postman → Collections** → เลือก collection **CreateDataCBS**
2. คลิก **Run** (Collection Runner)
3. ในหน้า Runner:
   - **Iterations**: ใส่จำนวน test cases (ดูจาก output ของ script)
   - **Data**: คลิก **Select File** → เลือก `postman-data.json`
4. คลิก **Run CreateDataCBS**

> Postman จะ skip request 4 และ 5 อัตโนมัติผ่าน `setNextRequest` และ chain CIF / coll_id ระหว่าง requests

---

### Step 5 — เก็บผลลัพธ์สำหรับหัวหน้า

หลังรันเสร็จ:

1. ไปที่ **Postman → Environments** → เลือก environment ที่ใช้
2. ค้นหาตัวแปร `run_results` → คัดลอก value ทั้งหมด
3. นำไป paste ใน [JSON to CSV converter](https://www.convertcsv.com/json-to-csv.htm)
4. Export เป็น CSV → นำไปรวมกับ `tracking-sheet.csv`

**ข้อมูลที่ได้สำหรับหัวหน้า:**

| Column | แหล่งที่มา |
|---|---|
| `seq` | หมายเลขลำดับจาก Planning CSV |
| `cif` | ได้จาก API response (Request 1 หรือ 2) |
| `coll_id` | ได้จาก API response (Request 6) |
| `aprs_value` | ราคาประเมินรวม (pre-generated) |
| `contract_date` | วันหมดอายุสัญญาเงินกู้ (pre-generated) |

---

## หลักประกันที่รองรับ

| Type | ประเภท | BOT Code | จำนวน Test Cases |
|---|---|---|---|
| 1 | ที่ดิน | 286003, 286006 | 30 |
| 2 | สิ่งปลูกสร้าง | 286004, 286008 | 30 |
| 3 | เครื่องจักร | 286011 | 15 |
| 4 | บัญชีเงินฝาก | — | **Skip** |
| 5 | พันธบัตร | 286018 | 50 |
| 8 | คอนโด/อาคารชุด | 286008, 286066 | 15 |
| 13 | หนังสือค้ำประกัน | 286061 | 13 |
| 14 | สลาก | 286023 | 16 |
| 17 | อสังหาริมทรัพย์อื่นๆ (ส.ป.ก.) | 286008 | 21 |
| 99 | อื่นๆ (สินค้าคงคลัง/เรือ) | 286039, 286214 | 56 |
| **รวม** | | | **246** |

---

## หมายเหตุ

- **Type 4 (บัญชีเงินฝาก)**: ต้องสร้างบัญชีจริงและฝากเงินในระบบธนาคารก่อน จึงต้องทดสอบแยกด้วยตนเอง
- **rows 1–30**: มี CIF และ coll_id กำหนดไว้แล้วใน Planning CSV (สร้างไว้ก่อนหน้า)
- **Request name ต้องตรงทุกตัวอักษร**: `postman.setNextRequest()` ใช้ชื่อ request ตรงตัว เช่น `"6-createCollateral คำอธิบาย"` (มีเว้นวรรคและภาษาไทย)
- **Response path**: ตรวจสอบ path ของ `customer_id` และ `coll_id` ใน API response จริงก่อนรัน แล้วแก้ไขใน Post-request Scripts ของ Request 1/2 และ 6
- **aprs_value**: สุ่มในช่วง 10,000–9,999,000 ลงท้ายด้วย 000 (ยกเว้น Type 5 ที่คำนวณจาก bond formula)
