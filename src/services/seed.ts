import { collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';

export async function seedWorkspaceIfEmpty(uid: string, displayName: string): Promise<void> {
  try {
    const existingCustomers = await getDocs(
      query(collection(db, 'customers'), where('viewerUids', 'array-contains', uid), limit(1))
    );
    if (!existingCustomers.empty) {
      return;
    }

    const batch = writeBatch(db);
    const viewers = [uid];

    // 1. Teams
    batch.set(doc(db, 'teams', 'team_tay_bac_sg'), {
      id: 'team_tay_bac_sg',
      name: 'Nhóm Đất Nền Tây Bắc TP.HCM',
      leaderUid: uid,
      leaderName: displayName,
      region: 'Củ Chi - Hóc Môn - Bình Chánh',
      memberUids: [uid],
      viewerUids: viewers,
      createdByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'teams', 'team_khu_dong'), {
      id: 'team_khu_dong',
      name: 'Nhóm Nhà Phố & Căn Hộ Khu Đông',
      leaderUid: uid,
      leaderName: displayName,
      region: 'TP. Thủ Đức - Quận 2 - Quận 9',
      memberUids: [uid],
      viewerUids: viewers,
      createdByUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Sample Fanpages (marked clearly as sandbox/template until real Meta OAuth connects)
    batch.set(doc(db, 'facebook_pages', 'page_bds_cuchi_01'), {
      id: 'page_bds_cuchi_01',
      pageId: '104829301120001',
      name: 'Đất Nền Củ Chi - Sổ Hồng Riêng',
      category: 'Bất động sản',
      avatarUrl: '/src/assets/images/property_land_cuchi_1795074676243.jpg',
      connectionStatus: 'DISCONNECTED',
      webhookSubscribed: false,
      aiEnabled: true,
      autoAssignRule: 'ROUND_ROBIN',
      totalConversations: 2,
      totalCustomers: 2,
      totalMessages: 5,
      connectedByUid: uid,
      lastError: 'Trang mẫu Sandbox. Nhấn "Kết nối Facebook" để liên kết Fanpage thật qua Meta OAuth.',
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'facebook_pages', 'page_nhapho_thuduc_02'), {
      id: 'page_nhapho_thuduc_02',
      pageId: '104829301120002',
      name: 'Nhà Phố Sài Gòn - Chính Chủ',
      category: 'Công ty bất động sản',
      avatarUrl: '/src/assets/images/property_townhouse_saigon_1795074676043.jpg',
      connectionStatus: 'DISCONNECTED',
      webhookSubscribed: false,
      aiEnabled: true,
      autoAssignRule: 'REGION',
      totalConversations: 2,
      totalCustomers: 2,
      totalMessages: 4,
      connectedByUid: uid,
      lastError: 'Trang mẫu Sandbox. Nhấn "Kết nối Facebook" để liên kết Fanpage thật qua Meta OAuth.',
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. Properties
    batch.set(doc(db, 'properties', 'prop_cuchi_01'), {
      id: 'prop_cuchi_01',
      code: 'BDS-CC-102',
      title: 'Đất thổ cư mặt tiền đường nhựa Tân Thông Hội, Củ Chi (125m2)',
      propertyType: 'LAND',
      transactionType: 'SELL',
      province: 'TP.HCM',
      district: 'Củ Chi',
      areaSqm: 125,
      priceVnd: 1050000000,
      legalStatus: 'Sổ hồng riêng, thổ cư 100%',
      status: 'AVAILABLE',
      imageUrl: '/src/assets/images/property_land_cuchi_1795074676243.jpg',
      description: 'Lô đất vuông vức 5x25m, cách Quốc lộ 22 chỉ 400m, dân cư hiện hữu, hỗ trợ vay ngân hàng.',
      ownerUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'properties', 'prop_thuduc_02'), {
      id: 'prop_thuduc_02',
      code: 'BDS-TD-205',
      title: 'Nhà phố 3 tầng KDC Hiệp Bình Chánh, TP. Thủ Đức (80m2)',
      propertyType: 'HOUSE',
      transactionType: 'SELL',
      province: 'TP.HCM',
      district: 'TP. Thủ Đức',
      areaSqm: 80,
      priceVnd: 6800000000,
      legalStatus: 'Sổ hồng hoàn công đầy đủ',
      status: 'AVAILABLE',
      imageUrl: '/src/assets/images/property_townhouse_saigon_1795074676043.jpg',
      description: 'Nhà 1 trệt 2 lầu sân thượng, 4PN, đường xe hơi 7m, gần Gigamall Phạm Văn Đồng.',
      ownerUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'properties', 'prop_q2_03'), {
      id: 'prop_q2_03',
      code: 'BDS-Q2-308',
      title: 'Căn hộ 2PN View Sông Thảo Điền - Masteri Riverside (72m2)',
      propertyType: 'APARTMENT',
      transactionType: 'SELL',
      province: 'TP.HCM',
      district: 'Quận 2',
      areaSqm: 72,
      priceVnd: 5200000000,
      legalStatus: 'Sổ hồng sở hữu lâu dài',
      status: 'RESERVED',
      imageUrl: '/src/assets/images/property_villa_riverside_1795074675117.jpg',
      description: 'Tầng trung view trực diện sông Sài Gòn, full nội thất cao cấp, đang có hợp đồng thuê 22tr/tháng.',
      ownerUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4. Customers
    const customersSeed = [
      {
        id: 'cust_minh_tuan_01',
        fullName: 'Nguyễn Minh Tuấn',
        primaryPhone: '0987654321',
        phones: ['0987654321'],
        facebookId: 'psid_882100441',
        facebookName: 'Minh Tuấn Nguyễn',
        avatarUrl: '/src/assets/images/avatar_crm_consultant_1795074675308.jpg',
        sourcePageId: 'page_bds_cuchi_01',
        sourcePageName: 'Đất Nền Củ Chi - Sổ Hồng Riêng',
        sourceChannel: 'Facebook Messenger',
        intent: 'BUY_LAND',
        propertyType: 'LAND',
        province: 'TP.HCM',
        district: 'Củ Chi',
        budgetMin: 900000000,
        budgetMax: 1100000000,
        areaMin: 100,
        areaMax: 150,
        legalRequirement: 'Sổ hồng riêng',
        leadScore: 92,
        priority: 'HIGH',
        status: 'Khách tiềm năng',
        assignedToUid: uid,
        assignedToName: displayName,
        tags: ['Mua đất Củ Chi', 'Đã có SĐT', 'Nhu cầu gấp'],
        notesSummary: 'Khách quan tâm lô 100-150m2 tài chính 1 tỷ có sổ riêng.',
      },
      {
        id: 'cust_thu_ha_02',
        fullName: 'Trần Thị Thu Hà',
        primaryPhone: '0912345678',
        phones: ['0912345678'],
        facebookId: 'psid_882100442',
        facebookName: 'Thu Hà Trần',
        avatarUrl: '',
        sourcePageId: 'page_nhapho_thuduc_02',
        sourcePageName: 'Nhà Phố Sài Gòn - Chính Chủ',
        sourceChannel: 'Facebook Messenger',
        intent: 'BUY_HOUSE',
        propertyType: 'HOUSE',
        province: 'TP.HCM',
        district: 'TP. Thủ Đức',
        budgetMin: 5500000000,
        budgetMax: 7000000000,
        areaMin: 70,
        areaMax: 100,
        legalRequirement: 'Hoàn công đầy đủ',
        leadScore: 86,
        priority: 'HIGH',
        status: 'Đã hẹn gặp',
        assignedToUid: uid,
        assignedToName: displayName,
        tags: ['Nhà phố Thủ Đức', 'Hẹn xem nhà'],
        notesSummary: 'Hẹn xem nhà Hiệp Bình Chánh cuối tuần này cùng gia đình.',
      },
      {
        id: 'cust_hoang_nam_03',
        fullName: 'Lê Hoàng Nam',
        primaryPhone: '',
        phones: [],
        facebookId: 'psid_882100443',
        facebookName: 'Hoàng Nam Lê',
        avatarUrl: '',
        sourcePageId: 'page_bds_cuchi_01',
        sourcePageName: 'Đất Nền Củ Chi - Sổ Hồng Riêng',
        sourceChannel: 'Facebook Messenger',
        intent: 'INVEST',
        propertyType: 'LAND',
        province: 'Long An',
        district: 'Đức Hòa',
        budgetMin: 1500000000,
        budgetMax: 2500000000,
        areaMin: 150,
        areaMax: 300,
        legalRequirement: 'Sổ riêng công chứng ngay',
        leadScore: 68,
        priority: 'MEDIUM',
        status: 'Chưa có số điện thoại',
        assignedToUid: uid,
        assignedToName: displayName,
        tags: ['Đầu tư', 'Chưa xin SĐT'],
        notesSummary: 'Đang hỏi bảng giá đất đầu tư ven TP.HCM, cần xin số Zalo gửi sổ.',
      },
      {
        id: 'cust_thanh_huong_04',
        fullName: 'Phạm Thanh Hương',
        primaryPhone: '0908112233',
        phones: ['0908112233'],
        facebookId: 'psid_882100444',
        facebookName: 'Thanh Hương Phạm',
        avatarUrl: '',
        sourcePageId: 'page_nhapho_thuduc_02',
        sourcePageName: 'Nhà Phố Sài Gòn - Chính Chủ',
        sourceChannel: 'Facebook Messenger',
        intent: 'SELL_HOUSE',
        propertyType: 'APARTMENT',
        province: 'TP.HCM',
        district: 'Quận 2',
        budgetMin: 5000000000,
        budgetMax: 5300000000,
        areaMin: 72,
        areaMax: 72,
        legalRequirement: 'Sổ hồng sẵn sàng giao dịch',
        leadScore: 80,
        priority: 'HIGH',
        status: 'Đã giao dịch',
        assignedToUid: uid,
        assignedToName: displayName,
        tags: ['Ký gửi bán', 'Quận 2'],
        notesSummary: 'Chủ nhà ký gửi căn hộ Masteri 2PN, đã chốt cọc khách đầu tư.',
      },
    ];

    for (const c of customersSeed) {
      batch.set(doc(db, 'customers', c.id), {
        ...c,
        createdByUid: uid,
        viewerUids: viewers,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Conversations & Messages
    batch.set(doc(db, 'conversations', 'conv_minh_tuan_01'), {
      id: 'conv_minh_tuan_01',
      customerId: 'cust_minh_tuan_01',
      customerName: 'Minh Tuấn Nguyễn',
      customerAvatar: '/src/assets/images/avatar_crm_consultant_1795074675308.jpg',
      pageId: 'page_bds_cuchi_01',
      pageName: 'Đất Nền Củ Chi - Sổ Hồng Riêng',
      facebookUserId: 'psid_882100441',
      lastMessage: 'Tôi đang tìm mua đất ở Củ Chi, diện tích 100 đến 150m2, ngân sách khoảng 1 tỷ, có sổ riêng, liên hệ số 0987654321.',
      unreadCount: 1,
      isImportant: true,
      hasPhone: true,
      assignedToUid: uid,
      assignedToName: displayName,
      status: 'OPEN',
      tags: ['Mua đất Củ Chi', 'Nhu cầu gấp'],
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'conversations', 'conv_thu_ha_02'), {
      id: 'conv_thu_ha_02',
      customerId: 'cust_thu_ha_02',
      customerName: 'Thu Hà Trần',
      customerAvatar: '',
      pageId: 'page_nhapho_thuduc_02',
      pageName: 'Nhà Phố Sài Gòn - Chính Chủ',
      facebookUserId: 'psid_882100442',
      lastMessage: 'Sáng thứ 7 lúc 9h30 chị ghé xem căn nhà phố Hiệp Bình Chánh nhé em, số chị 0912345678.',
      unreadCount: 0,
      isImportant: true,
      hasPhone: true,
      assignedToUid: uid,
      assignedToName: displayName,
      status: 'IN_PROGRESS',
      tags: ['Hẹn xem nhà'],
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'conversations', 'conv_hoang_nam_03'), {
      id: 'conv_hoang_nam_03',
      customerId: 'cust_hoang_nam_03',
      customerName: 'Hoàng Nam Lê',
      customerAvatar: '',
      pageId: 'page_bds_cuchi_01',
      pageName: 'Đất Nền Củ Chi - Sổ Hồng Riêng',
      facebookUserId: 'psid_882100443',
      lastMessage: 'Gửi giúp anh bảng giá các lô đầu tư khu vực giáp ranh Long An tầm 2 tỷ nhé.',
      unreadCount: 2,
      isImportant: false,
      hasPhone: false,
      assignedToUid: uid,
      assignedToName: displayName,
      status: 'OPEN',
      tags: ['Đầu tư'],
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const msgBatch = writeBatch(db);
    msgBatch.set(doc(db, 'conversations', 'conv_minh_tuan_01', 'messages', 'msg_mt_01'), {
      id: 'msg_mt_01',
      conversationId: 'conv_minh_tuan_01',
      senderType: 'CUSTOMER',
      senderUid: uid,
      senderName: 'Minh Tuấn Nguyễn',
      text: 'Chào shop, bên mình còn lô đất nào khu vực Tân Thông Hội Củ Chi không ạ?',
      deliveryStatus: 'RECEIVED',
      extractedPhones: [],
      viewerUids: viewers,
      createdAt: serverTimestamp(),
    });

    msgBatch.set(doc(db, 'conversations', 'conv_minh_tuan_01', 'messages', 'msg_mt_02'), {
      id: 'msg_mt_02',
      conversationId: 'conv_minh_tuan_01',
      senderType: 'AGENT',
      senderUid: uid,
      senderName: displayName,
      text: 'Dạ chào anh Tuấn, bên em hiện có lô mặt tiền đường nhựa Tân Thông Hội 125m2 thổ cư 100%, sổ hồng riêng giá 1.05 tỷ ạ. Anh đang tìm tầm diện tích và tài chính bao nhiêu ạ?',
      deliveryStatus: 'DELIVERED',
      extractedPhones: [],
      viewerUids: viewers,
      createdAt: serverTimestamp(),
    });

    msgBatch.set(doc(db, 'conversations', 'conv_minh_tuan_01', 'messages', 'msg_mt_03'), {
      id: 'msg_mt_03',
      conversationId: 'conv_minh_tuan_01',
      senderType: 'CUSTOMER',
      senderUid: uid,
      senderName: 'Minh Tuấn Nguyễn',
      text: 'Tôi đang tìm mua đất ở Củ Chi, diện tích 100 đến 150m2, ngân sách khoảng 1 tỷ, có sổ riêng, liên hệ số 0987654321.',
      deliveryStatus: 'RECEIVED',
      extractedPhones: ['0987654321'],
      viewerUids: viewers,
      createdAt: serverTimestamp(),
    });

    msgBatch.set(doc(db, 'conversations', 'conv_thu_ha_02', 'messages', 'msg_th_01'), {
      id: 'msg_th_01',
      conversationId: 'conv_thu_ha_02',
      senderType: 'CUSTOMER',
      senderUid: uid,
      senderName: 'Thu Hà Trần',
      text: 'Sáng thứ 7 lúc 9h30 chị ghé xem căn nhà phố Hiệp Bình Chánh nhé em, số chị 0912345678.',
      deliveryStatus: 'RECEIVED',
      extractedPhones: ['0912345678'],
      viewerUids: viewers,
      createdAt: serverTimestamp(),
    });

    msgBatch.set(doc(db, 'conversations', 'conv_hoang_nam_03', 'messages', 'msg_hn_01'), {
      id: 'msg_hn_01',
      conversationId: 'conv_hoang_nam_03',
      senderType: 'CUSTOMER',
      senderUid: uid,
      senderName: 'Hoàng Nam Lê',
      text: 'Gửi giúp anh bảng giá các lô đầu tư khu vực giáp ranh Long An tầm 2 tỷ nhé.',
      deliveryStatus: 'RECEIVED',
      extractedPhones: [],
      viewerUids: viewers,
      createdAt: serverTimestamp(),
    });

    // 6. Tasks & Appointments
    batch.set(doc(db, 'tasks', 'task_call_tuan_01'), {
      id: 'task_call_tuan_01',
      customerId: 'cust_minh_tuan_01',
      customerName: 'Nguyễn Minh Tuấn',
      title: 'Gọi điện tư vấn lô đất Tân Thông Hội 125m2 & gửi vị trí Google Maps',
      taskType: 'CALL',
      dueDate: '2026-11-19 10:00',
      priority: 'HIGH',
      status: 'PENDING',
      assignedToUid: uid,
      assignedToName: displayName,
      notes: 'Khách có sẵn tài chính 1 tỷ, ưu tiên sổ riêng sang tên ngay.',
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'tasks', 'task_xin_sdt_nam_02'), {
      id: 'task_xin_sdt_nam_02',
      customerId: 'cust_hoang_nam_03',
      customerName: 'Lê Hoàng Nam',
      title: 'Nhắn tin xin số Zalo gửi bảng giá đất đầu tư Long An',
      taskType: 'MESSAGE',
      dueDate: '2026-11-19 14:30',
      priority: 'MEDIUM',
      status: 'PENDING',
      assignedToUid: uid,
      assignedToName: displayName,
      notes: 'Khách chưa để lại SĐT trên Messenger.',
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'appointments', 'appt_thu_ha_01'), {
      id: 'appt_thu_ha_01',
      customerId: 'cust_thu_ha_02',
      customerName: 'Trần Thị Thu Hà',
      propertyId: 'prop_thuduc_02',
      propertyTitle: 'Nhà phố 3 tầng KDC Hiệp Bình Chánh, TP. Thủ Đức (80m2)',
      location: 'KDC Hiệp Bình Chánh, Đường số 25, TP. Thủ Đức',
      scheduledAt: '2026-11-21 09:30',
      status: 'CONFIRMED',
      assignedToUid: uid,
      assignedToName: displayName,
      notes: 'Mang theo bản photo sổ hồng và hợp đồng cọc mẫu.',
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 7. AI Analysis Seed
    batch.set(doc(db, 'ai_analyses', 'ai_minh_tuan_01'), {
      id: 'ai_minh_tuan_01',
      conversationId: 'conv_minh_tuan_01',
      customerId: 'cust_minh_tuan_01',
      customerName: 'Nguyễn Minh Tuấn',
      sourceText: 'Tôi đang tìm mua đất ở Củ Chi, diện tích 100 đến 150m2, ngân sách khoảng 1 tỷ, có sổ riêng, liên hệ số 0987654321.',
      phone: '0987654321',
      intent: 'BUY_LAND',
      propertyType: 'LAND',
      province: 'TP.HCM',
      district: 'Củ Chi',
      budgetMin: null,
      budgetMax: 1000000000,
      areaMin: 100,
      areaMax: 150,
      legalRequirement: 'Sổ riêng',
      leadScore: 92,
      priority: 'HIGH',
      summary: 'Khách có nhu cầu mua đất tại Củ Chi diện tích 100-150m2, ngân sách khoảng 1 tỷ, yêu cầu sổ riêng.',
      nextAction: 'Gọi điện tư vấn lô BDS-CC-102 và gửi sổ qua Zalo ngay.',
      provider: 'gemini',
      isEditedByHuman: false,
      createdByUid: uid,
      viewerUids: viewers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 8. Tags & Sources
    const tagsSeed = [
      { id: 'tag_mua_dat_cuchi', name: 'Mua đất Củ Chi', color: 'blue', category: 'Khu vực' },
      { id: 'tag_da_co_sdt', name: 'Đã có SĐT', color: 'emerald', category: 'Trạng thái' },
      { id: 'tag_nhu_cau_gap', name: 'Nhu cầu gấp', color: 'rose', category: 'Ưu tiên' },
      { id: 'tag_dau_tu', name: 'Khách đầu tư', color: 'amber', category: 'Chân dung' },
    ];
    for (const t of tagsSeed) {
      batch.set(doc(db, 'tags', t.id), {
        ...t,
        createdByUid: uid,
        viewerUids: viewers,
        createdAt: serverTimestamp(),
      });
    }

    const sourcesSeed = [
      { id: 'src_fb_messenger', name: 'Facebook Messenger Ads', channel: 'Facebook', isActive: true },
      { id: 'src_fb_organic', name: 'Fanpage Tự Nhiên', channel: 'Facebook', isActive: true },
      { id: 'src_zalo_referral', name: 'Zalo / Giới thiệu', channel: 'Referral', isActive: true },
    ];
    for (const s of sourcesSeed) {
      batch.set(doc(db, 'customer_sources', s.id), {
        ...s,
        createdByUid: uid,
        viewerUids: viewers,
        createdAt: serverTimestamp(),
      });
    }

    // 9. System Settings & Welcome Notification
    batch.set(doc(db, 'system_settings', 'default_settings'), {
      id: 'default_settings',
      companyName: 'Realty Messenger CRM',
      autoAssignMethod: 'ROUND_ROBIN',
      preventDuplicateAssignment: true,
      aiAutoAnalyze: true,
      aiProvider: 'gemini',
      dataRetentionDays: 365,
      updatedByUid: uid,
      viewerUids: viewers,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'notifications', `notif_welcome_${uid.slice(0, 10)}`), {
      id: `notif_welcome_${uid.slice(0, 10)}`,
      recipientUid: uid,
      title: 'Khởi tạo không gian Realty Messenger CRM thành công',
      body: 'Dữ liệu mẫu BĐS và hộp thư Sandbox đã sẵn sàng. Bạn có thể kết nối Fanpage thật hoặc thử nghiệm trích xuất SĐT + AI ngay.',
      type: 'SYSTEM',
      isRead: false,
      linkTarget: 'inbox',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    await msgBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_workspace');
  }
}
