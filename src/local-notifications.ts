import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';

const STORAGE_KEY='hamza_scheduled_due_notification_ids_v1';
export type LocalDueNotification={id:string;date:string;title:string;body:string};
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowAlert:true,shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});

async function ensureChannel():Promise<void>{
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('reminders',{name:'تذكيرات HamZa',importance:Notifications.AndroidImportance.DEFAULT,vibrationPattern:[0,180,100,180]});
}
export async function requestLocalNotificationPermission():Promise<boolean>{
 await ensureChannel();
 const current=await Notifications.getPermissionsAsync();
 const result=current.granted?current:await Notifications.requestPermissionsAsync();
 return result.granted===true||result.status==='granted';
}
export async function cancelScheduledDueNotifications():Promise<void>{
 let ids:string[]=[];try{const raw=await AsyncStorage.getItem(STORAGE_KEY);const parsed=raw?JSON.parse(raw):[];if(Array.isArray(parsed))ids=parsed.filter((value):value is string=>typeof value==='string');}catch{}
 await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>undefined)));
 await AsyncStorage.removeItem(STORAGE_KEY);
}
export async function syncScheduledDueNotifications(items:LocalDueNotification[]):Promise<number>{
 await cancelScheduledDueNotifications();
 const permissions=await Notifications.getPermissionsAsync();
 if(!permissions.granted&&permissions.status!=='granted')return 0;
 await ensureChannel();
 const now=Date.now();const current=new Date(now);const todayLocal=[current.getFullYear(),String(current.getMonth()+1).padStart(2,'0'),String(current.getDate()).padStart(2,'0')].join('-');const scheduledIds:string[]=[];
 for(const item of items.slice(0,80)){
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)||!item.id||!item.title.trim())continue;
  const [year,month,day]=item.date.split('-').map(Number);
  let fireAt=new Date(year,month-1,day,9,0,0,0);
  if(!Number.isFinite(fireAt.getTime()))continue;
  if(fireAt.getTime()<=now&&item.date===todayLocal)fireAt=new Date(now+60_000);
  if(fireAt.getTime()<=now)continue;
  const id=await Notifications.scheduleNotificationAsync({content:{title:item.title,body:item.body,data:{reminderId:item.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:fireAt,channelId:'reminders'}});
  scheduledIds.push(id);
 }
 await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(scheduledIds));
 return scheduledIds.length;
}
