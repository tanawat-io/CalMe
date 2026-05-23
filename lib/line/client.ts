import * as line from '@line/bot-sdk';
import { FoodAnalysisResult, FoodLog } from '../gemini';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'placeholder';

// Create MessagingApiClient
export const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken,
});

/**
 * Downloads image content from LINE Content API as a Buffer.
 */
export async function getLineImageContent(messageId: string): Promise<Buffer> {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download LINE image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Helper to construct a beautiful LINE Flex Message for food analysis results.
 */
export function createFoodFlexMessage(
  analysis: FoodAnalysisResult,
  logId: string,
  totalTodayCals: number,
  targetCals: number
): line.messagingApi.FlexMessage {
  const { foodName, foodNameTh, calories, protein, carbs, fat, portionSize } = analysis;
  
  // Calculate percentage of today's budget
  const nextTotal = totalTodayCals + calories;
  const percentage = Math.min(100, Math.round((nextTotal / targetCals) * 100));

  return {
    type: 'flex',
    altText: `CalMe: ผลการวิเคราะห์ ${foodNameTh}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '✨ AI CALORIE ANALYSIS',
            weight: 'bold',
            color: '#7c4dff',
            size: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        contents: [
          // Food Title & Description
          {
            type: 'text',
            text: foodNameTh,
            weight: 'bold',
            size: 'xl',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: foodName,
            size: 'xs',
            color: '#90a0c0',
            style: 'italic',
            margin: 'xs'
          },
          {
            type: 'text',
            text: `สัดส่วน: ${portionSize}`,
            size: 'sm',
            color: '#607090',
            margin: 'sm'
          },
          
          // Separator
          {
            type: 'separator',
            margin: 'md',
            color: '#ffffff14'
          },
          
          // Main Calories
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: 'พลังงานคาดการณ์',
                color: '#90a0c0',
                size: 'sm',
                flex: 3
              },
              {
                type: 'text',
                text: `${calories} kcal`,
                color: '#00e676',
                weight: 'bold',
                size: 'xl',
                flex: 2,
                align: 'end'
              }
            ]
          },
          
          // Separator
          {
            type: 'separator',
            margin: 'md',
            color: '#ffffff14'
          },
          
          // Macros breakdown (Pill badges style)
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#7c4dff14',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'โปรตีน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${protein}g`, size: 'sm', color: '#7c4dff', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#00e67614',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'คาร์บ', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${carbs}g`, size: 'sm', color: '#00e676', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ff910014',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'ไขมัน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${fat}g`, size: 'sm', color: '#ff9100', weight: 'bold', align: 'center' }
                ]
              }
            ]
          },
          
          // Separator
          {
            type: 'separator',
            margin: 'md',
            color: '#ffffff14'
          },
          
          // Daily Budget progress indicator
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: `แคลอรี่วันนี้สะสม: ${nextTotal} / ${targetCals} kcal`,
                    size: 'xs',
                    color: '#90a0c0'
                  },
                  {
                    type: 'text',
                    text: `${percentage}%`,
                    size: 'xs',
                    color: '#ffffff',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ffffff14',
                height: '6px',
                cornerRadius: '3px',
                margin: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: percentage >= 100 ? '#ff4081' : '#7c4dff',
                    width: `${percentage}%`,
                    height: '6px',
                    cornerRadius: '3px',
                    contents: []
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: '#0a0a1a',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#00c853',
            action: {
              type: 'postback',
              label: '✅ ยืนยัน',
              data: `action=confirm&logId=${logId}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#ff4081',
            action: {
              type: 'postback',
              label: '🗑️ ลบ',
              data: `action=delete&logId=${logId}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#90a0c0',
            action: {
              type: 'postback',
              label: '✏️ แก้ไข',
              data: `action=edit&logId=${logId}`
            }
          }
        ]
      }
    }
  };
}

/**
 * Helper to construct a beautiful LINE Flex Message for daily calorie summary.
 */
export function createSummaryFlexMessage(
  totalCals: number,
  targetCals: number,
  protein: number,
  carbs: number,
  fat: number,
  streak: number,
  todayMeals: FoodLog[],
  dashboardUrl: string
): line.messagingApi.FlexMessage {
  const percentage = Math.min(100, Math.round((totalCals / targetCals) * 100));
  const remaining = Math.max(0, targetCals - totalCals);

  const mealIcons = {
    breakfast: '🍳',
    lunch: '🍱',
    dinner: '🍛',
    snack: '🍎',
  };

  const mealContents: line.messagingApi.FlexComponent[] = todayMeals.length === 0
    ? [
        {
          type: 'text',
          text: 'ยังไม่มีประวัติอาหารสำหรับวันนี้',
          color: '#607090',
          size: 'xs',
          style: 'italic',
          align: 'center',
          margin: 'sm'
        }
      ]
    : todayMeals.map((meal) => {
        const icon = mealIcons[meal.mealType as keyof typeof mealIcons] || '🍲';
        const displayName = meal.foodNameTh || meal.foodName;
        return {
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          alignItems: 'center',
          contents: [
            {
              type: 'text',
              text: `${icon} ${displayName}`,
              color: '#ffffff',
              size: 'sm',
              flex: 4,
              wrap: true
            },
            {
              type: 'text',
              text: `${meal.calories} kcal`,
              color: '#00e676',
              weight: 'bold',
              size: 'sm',
              flex: 2,
              align: 'end'
            }
          ]
        };
      });

  return {
    type: 'flex',
    altText: 'CalMe: สรุปแคลอรี่ประจำวัน',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปแคลอรี่วันนี้',
            weight: 'bold',
            color: '#00e676',
            size: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        spacing: 'md',
        contents: [
          // Calorie Progress Rings Text
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'ทานไปแล้ว',
                    color: '#90a0c0',
                    size: 'xs'
                  },
                  {
                    type: 'text',
                    text: `${totalCals}`,
                    color: '#ffffff',
                    weight: 'bold',
                    size: 'xxl'
                  },
                  {
                    type: 'text',
                    text: `จากเป้าหมาย ${targetCals} kcal`,
                    color: '#607090',
                    size: 'xxs'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                alignItems: 'flex-end',
                contents: [
                  {
                    type: 'text',
                    text: 'เหลือแคลอรี่ที่ทานได้',
                    color: '#90a0c0',
                    size: 'xs'
                  },
                  {
                    type: 'text',
                    text: `${remaining}`,
                    color: '#00e676',
                    weight: 'bold',
                    size: 'xxl'
                  },
                  {
                    type: 'text',
                    text: 'kcal',
                    color: '#607090',
                    size: 'xs'
                  }
                ]
              }
            ]
          },
          
          // Progress bar
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ffffff14',
                height: '8px',
                cornerRadius: '4px',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: percentage >= 100 ? '#ff4081' : '#00e676',
                    width: `${percentage}%`,
                    height: '8px',
                    cornerRadius: '4px',
                    contents: []
                  }
                ]
              }
            ]
          },

          // Macros Summary
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ffffff05',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'โปรตีน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${protein}g`, size: 'xs', color: '#7c4dff', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ffffff05',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'คาร์บ', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${carbs}g`, size: 'xs', color: '#00e676', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ffffff05',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: 'ไขมัน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${fat}g`, size: 'xs', color: '#ff9100', weight: 'bold', align: 'center' }
                ]
              }
            ]
          },

          // Separator
          {
            type: 'separator',
            margin: 'lg',
            color: '#ffffff14'
          },
          // Meals Title
          {
            type: 'text',
            text: '📋 รายการอาหารวันนี้',
            weight: 'bold',
            color: '#90a0c0',
            size: 'sm',
            margin: 'md'
          },
          // Meals List Box
          {
            type: 'box',
            layout: 'vertical',
            margin: 'sm',
            spacing: 'sm',
            contents: mealContents
          },

          // Streak Info
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#7c4dff14',
            paddingAll: 'md',
            cornerRadius: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: `🔥 บันทึกต่อเนื่อง: ${streak} วัน`,
                color: '#7c4dff',
                weight: 'bold',
                size: 'sm'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'button',
            style: 'link',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🌐 เปิดดูหน้าเว็ป CalMe',
              uri: dashboardUrl
            }
          }
        ]
      }
    }
  };
}

/**
 * Helper to construct a beautiful LINE Flex Message for editing options.
 */
export function createEditMenuFlexMessage(logId: string, foodNameTh: string): line.messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `CalMe: แก้ไขเมนู ${foodNameTh}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '✏️ เลือกหัวข้อที่ต้องการแก้ไข',
            weight: 'bold',
            color: '#ff4081',
            size: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: `เมนู: ${foodNameTh}`,
            weight: 'bold',
            size: 'sm',
            color: '#ffffff'
          },
          {
            type: 'text',
            text: 'คุณสามารถปรับแก้ไขประเภทมื้ออาหาร ปริมาณสัดส่วนจาน หรือพิมพ์กำหนดแคลอรี่เองได้โดยตรงจากแชต LINE ครับ',
            size: 'xs',
            color: '#90a0c0',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#7c4dff',
            action: {
              type: 'postback',
              label: '🍳 เปลี่ยนประเภทมื้ออาหาร',
              data: `action=change_meal_select&logId=${logId}`
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#00e676',
            action: {
              type: 'postback',
              label: '⚖️ ปรับสัดส่วนอาหาร (จาน)',
              data: `action=change_portion_select&logId=${logId}`
            }
          },
          {
            type: 'button',
            style: 'secondary',
            color: '#ffffff14',
            action: {
              type: 'postback',
              label: '🔥 พิมพ์แก้ไขแคลอรี่เอง',
              data: `action=change_cal_select&logId=${logId}`
            }
          }
        ]
      }
    }
  };
}

/**
 * Helper to construct a beautiful LINE Flex Message welcoming user to start profile setup.
 */
export function createOnboardingWelcomeFlexMessage(): line.messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'CalMe: ยินดีต้อนรับเข้าสู่ระบบตั้งค่าเป้าหมาย',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '🥑 คู่มือเริ่มต้นการใช้งาน CalMe',
            weight: 'bold',
            color: '#00e676',
            size: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'เริ่มต้นคำนวณแคลอรี่เป้าหมายส่วนบุคคล',
            weight: 'bold',
            size: 'sm',
            color: '#ffffff',
            wrap: true
          },
          {
            type: 'text',
            text: 'เพื่อประสิทธิภาพที่ดีที่สุดในการใช้ AI วิเคราะห์สารอาหารและแคลอรี่ บอทต้องการข้อมูลร่างกายพื้นฐานของคุณตาม 3 ขั้นตอนง่ายๆ ดังนี้ครับ:',
            size: 'xs',
            color: '#90a0c0',
            wrap: true
          },
          // Step 1
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            alignItems: 'center',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#7c4dff1a',
                width: '32px',
                height: '32px',
                cornerRadius: '16px',
                alignItems: 'center',
                justifyContent: 'center',
                contents: [
                  {
                    type: 'text',
                    text: '1',
                    color: '#7c4dff',
                    weight: 'bold',
                    size: 'sm',
                    align: 'center'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                flex: 4,
                contents: [
                  {
                    type: 'text',
                    text: 'กรอกข้อมูลสัดส่วนร่างกาย',
                    weight: 'bold',
                    size: 'xs',
                    color: '#ffffff'
                  },
                  {
                    type: 'text',
                    text: 'ระบุเพศ, อายุ, ส่วนสูง และน้ำหนักปัจจุบันของคุณ',
                    size: 'xxs',
                    color: '#90a0c0',
                    wrap: true
                  }
                ]
              }
            ]
          },
          // Step 2
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#00e6761a',
                width: '32px',
                height: '32px',
                cornerRadius: '16px',
                alignItems: 'center',
                justifyContent: 'center',
                contents: [
                  {
                    type: 'text',
                    text: '2',
                    color: '#00e676',
                    weight: 'bold',
                    size: 'sm',
                    align: 'center'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                flex: 4,
                contents: [
                  {
                    type: 'text',
                    text: 'เลือกระดับกิจกรรม & เป้าหมาย',
                    weight: 'bold',
                    size: 'xs',
                    color: '#ffffff'
                  },
                  {
                    type: 'text',
                    text: 'ระดับการออกกำลังกาย และเป้าหมาย (ลด/คงที่/เพิ่มน้ำหนัก)',
                    size: 'xxs',
                    color: '#90a0c0',
                    wrap: true
                  }
                ]
              }
            ]
          },
          // Step 3
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ff91001a',
                width: '32px',
                height: '32px',
                cornerRadius: '16px',
                alignItems: 'center',
                justifyContent: 'center',
                contents: [
                  {
                    type: 'text',
                    text: '3',
                    color: '#ff9100',
                    weight: 'bold',
                    size: 'sm',
                    align: 'center'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                flex: 4,
                contents: [
                  {
                    type: 'text',
                    text: 'รับเป้าหมายและเริ่มบันทึก!',
                    weight: 'bold',
                    size: 'xs',
                    color: '#ffffff'
                  },
                  {
                    type: 'text',
                    text: 'ระบบจะคำนวณเป้าหมายแคลอรี่รายวันและสามารถส่งรูปเพื่อบันทึกทันที',
                    size: 'xxs',
                    color: '#90a0c0',
                    wrap: true
                  }
                ]
              }
            ]
          },
          // Hint Banner
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            backgroundColor: '#ffffff05',
            paddingAll: 'md',
            cornerRadius: 'md',
            contents: [
              {
                type: 'text',
                text: '⏱️ ใช้เวลาตั้งค่าประมาณ 1 นาทีเท่านั้น',
                color: '#ff9100',
                size: 'xs',
                weight: 'bold',
                align: 'center'
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#7c4dff',
            action: {
              type: 'postback',
              label: '🎯 เริ่มตั้งค่าข้อมูลส่วนตัว',
              data: 'action=setup_start'
            }
          }
        ]
      }
    }
  };
}

/**
 * Helper to construct a premium LINE Flex Message for main navigation menu.
 */
export function createMainMenuFlexMessage(baseUrl: string): line.messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'CalMe: เมนูหลักการใช้งาน',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '🥑 เมนูหลัก CalMe Bot',
            weight: 'bold',
            color: '#7c4dff',
            size: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'กรุณาเลือกฟังก์ชันที่ต้องการทำรายการด้านล่างนี้ หรือถ่ายรูปส่งอาหารเพื่อให้บอทวิเคราะห์แคลอรี่ได้ทันทีครับ',
            size: 'xs',
            color: '#90a0c0',
            wrap: true
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#00e676',
            action: {
              type: 'postback',
              label: '📊 สรุปการกินวันนี้',
              data: 'action=summary_trigger'
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#00b0ff',
            action: {
              type: 'postback',
              label: '⚖️ บันทึกน้ำหนักตัว',
              data: 'action=log_weight_prompt'
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#ff9100',
            action: {
              type: 'uri',
              label: '📅 ดูประวัติอาหารย้อนหลัง',
              uri: `${baseUrl}/history`
            }
          },
          {
            type: 'button',
            style: 'primary',
            color: '#7c4dff',
            action: {
              type: 'postback',
              label: '⚙️ ตั้งค่าเป้าหมายแคลอรี่ใหม่',
              data: 'action=setup_start'
            }
          },
          {
            type: 'button',
            style: 'link',
            color: '#7c4dff',
            height: 'sm',
            action: {
              type: 'uri',
              label: '🌐 เปิดดูหน้าเว็บแดชบอร์ด',
              uri: `${baseUrl}/dashboard`
            }
          }
        ]
      }
    }
  };
}

export interface OnboardingProfile {
  gender?: string;
  program?: string;
  activityLevel?: string;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  age?: number;
  height?: number;
  weight?: number;
}

/**
 * Helper to construct a beautiful LINE Flex Message summarizing newly configured user targets.
 */
export function createOnboardingCompleteFlexMessage(profile: OnboardingProfile): line.messagingApi.FlexMessage {
  const genderNames = { male: 'ชาย', female: 'หญิง' };
  const programNames = {
    lose_weight: 'ลดน้ำหนัก',
    maintain: 'คงน้ำหนักเดิม',
    build_muscle: 'เพิ่มกล้ามเนื้อ'
  };
  const activityNames = {
    sedentary: 'นั่งทำงานกับที่',
    light: 'ออกกำลังกายเบาๆ (1-3 วัน/สัปดาห์)',
    moderate: 'ออกกำลังกายปานกลาง (3-5 วัน/สัปดาห์)',
    active: 'ออกกำลังกายหนัก (6-7 วัน/สัปดาห์)',
    extra: 'ออกกำลังกายหนักมาก'
  };

  const genderName = genderNames[profile.gender as keyof typeof genderNames] || profile.gender;
  const programName = programNames[profile.program as keyof typeof programNames] || profile.program;
  const activityName = activityNames[profile.activityLevel as keyof typeof activityNames] || profile.activityLevel;

  return {
    type: 'flex',
    altText: 'CalMe: ยืนยันการตั้งค่าเป้าหมายสำเร็จ',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'text',
            text: '🎉 ตั้งค่าเป้าหมายสำเร็จ!',
            weight: 'bold',
            color: '#00e676',
            size: 'md'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#12122a',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '🎯 เป้าหมายพลังงานและสารอาหารของคุณ:',
            weight: 'bold',
            size: 'sm',
            color: '#ffffff'
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: 'เป้าหมายพลังงาน',
                color: '#90a0c0',
                size: 'sm',
                flex: 3
              },
              {
                type: 'text',
                text: `${profile.targetCalories} kcal`,
                color: '#00e676',
                weight: 'bold',
                size: 'xl',
                flex: 2,
                align: 'end'
              }
            ]
          },
          {
            type: 'separator',
            color: '#ffffff14'
          },
          // Macros breakdown
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#7c4dff14',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'โปรตีน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${profile.targetProtein}g`, size: 'sm', color: '#7c4dff', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#00e67614',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'คาร์บ', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${profile.targetCarbs}g`, size: 'sm', color: '#00e676', weight: 'bold', align: 'center' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#ff910014',
                paddingAll: 'sm',
                cornerRadius: 'md',
                alignItems: 'center',
                flex: 1,
                contents: [
                  { type: 'text', text: 'ไขมัน', size: 'xxs', color: '#90a0c0', align: 'center' },
                  { type: 'text', text: `${profile.targetFat}g`, size: 'sm', color: '#ff9100', weight: 'bold', align: 'center' }
                ]
              }
            ]
          },
          {
            type: 'separator',
            color: '#ffffff14'
          },
          {
            type: 'text',
            text: '📋 ข้อมูลประวัติของคุณ:',
            weight: 'bold',
            size: 'xs',
            color: '#90a0c0',
            margin: 'md'
          },
          // Profile Details Grid
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เพศ / อายุ:', size: 'xs', color: '#607090', flex: 2 },
                  { type: 'text', text: `${genderName} / ${profile.age} ปี`, size: 'xs', color: '#ffffff', flex: 3 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ส่วนสูง / น้ำหนัก:', size: 'xs', color: '#607090', flex: 2 },
                  { type: 'text', text: `${profile.height} ซม. / ${profile.weight} กก.`, size: 'xs', color: '#ffffff', flex: 3 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'กิจกรรมประจำวัน:', size: 'xs', color: '#607090', flex: 2 },
                  { type: 'text', text: activityName, size: 'xs', color: '#ffffff', flex: 3, wrap: true }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เป้าหมายร่างกาย:', size: 'xs', color: '#607090', flex: 2 },
                  { type: 'text', text: programName, size: 'xs', color: '#ffffff', flex: 3 }
                ]
              }
            ]
          },
          {
            type: 'separator',
            color: '#ffffff14',
            margin: 'md'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '🚀 แนะนำขั้นตอนถัดไป:',
                weight: 'bold',
                size: 'xs',
                color: '#ffffff',
                wrap: true
              },
              {
                type: 'text',
                text: '1. 📸 ถ่ายรูปหรือส่งภาพอาหาร เข้ามาในแชตเพื่อบันทึกทันที',
                size: 'xs',
                color: '#90a0c0',
                wrap: true
              },
              {
                type: 'text',
                text: '2. ✍️ พิมพ์ชื่ออาหาร เพื่อให้ AI บันทึกด้วยข้อความ (เช่น "ข้าวมันไก่")',
                size: 'xs',
                color: '#90a0c0',
                wrap: true
              },
              {
                type: 'text',
                text: '3. 💬 พิมพ์คำว่า "เมนู" เพื่อเปิดเมนูหลักได้ทุกเมื่อ',
                size: 'xs',
                color: '#90a0c0',
                wrap: true
              }
            ]
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0a0a1a',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#7c4dff',
            action: {
              type: 'postback',
              label: '📸 เริ่มถ่ายรูปบันทึกอาหาร',
              data: 'action=show_help_capture'
            }
          }
        ]
      }
    }
  };
}

