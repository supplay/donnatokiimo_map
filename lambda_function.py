import json

def lambda_handler(event, context):
    detail = event.get("detail", {})

    event_type = detail.get("EventType")
    geofence_id = detail.get("GeofenceId")
    device_id = detail.get("DeviceId")
    position = detail.get("Position")
    sample_time = detail.get("SampleTime")

    message = {
        "message": "Vehicle entered geofence",
        "eventType": event_type,
        "geofenceId": geofence_id,
        "deviceId": device_id,
        "position": position,
        "sampleTime": sample_time
    }

    print(json.dumps(message, ensure_ascii=False))

    return {
        "statusCode": 200,
        "body": json.dumps(message, ensure_ascii=False)
    }
