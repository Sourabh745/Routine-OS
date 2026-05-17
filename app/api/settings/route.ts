import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase/server';

export async function PATCH(request: Request) {
    const supabase = await createClient();
    const {data : {user}} = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const body = await request.json();

    const {data , error } = await supabase
        .from('profiles')
        .update({
            full_name: body.full_name,
            timezone: body.timezone,
            morning_briefing_time: body.morning_briefing_time,
            evening_checkin_time: body.evening_checkin_time,
        })
        .eq('id', user.id)
        .select()
        .single();
        
        if(error){
            return NextResponse.json({error: error.message}, {status: 500});
        }

        return NextResponse.json({ profile: data });
}